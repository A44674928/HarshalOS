import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.mjs';
import { auditTemplate, sha256 } from '../worker/community-audit.mjs';
import { digest } from '../worker/community-auth.mjs';
const origin='https://os.example';
async function fixture(t) {
  const sql=new DatabaseSync(':memory:'); t.after(()=>sql.close()); sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_private_drafts.sql','0002_auth_sessions.sql','0003_private_runs.sql','0004_publication.sql']) sql.exec(readFileSync(new URL('../migrations/community/'+file,import.meta.url),'utf8'));
  let intercept=null;
  const db={prepare(text){
    if (text.startsWith('INSERT INTO community_publications') && intercept) { const fn=intercept; intercept=null; fn(); }
    let args=[]; const q={bind(...a){args=a;return q;}, exec(){return sql.prepare(text).run(...args);}, async run(){return q.exec();},async first(){return sql.prepare(text).get(...args)??null;},async all(){return {results:sql.prepare(text).all(...args)};}};return q;
  },async batch(statements){sql.exec('BEGIN');try{const results=statements.map(q=>q.exec());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const now=Math.floor(Date.now()/1000);
  for (const id of ['alice','bob','moderator']) {sql.prepare('INSERT INTO community_users VALUES(?,?,?,0,?)').run(id,'https://issuer.example/',id,now*1000);sql.prepare('INSERT INTO community_sessions VALUES(?,?,?,?,?,?)').run(await digest(id[0].repeat(43)),id,'https://issuer.example/','client',now,now+86400);}
  const env={COMMUNITY_ENABLED:'true',COMMUNITY_DB:db,COMMUNITY_ORIGIN:origin,OIDC_ISSUER:'https://issuer.example/',OIDC_CLIENT_ID:'client',OIDC_CLIENT_SECRET:'secret',COMMUNITY_RATE_SECRET:'r'.repeat(64),OIDC_ADMIN_SUBJECTS:'moderator'};
  async function call(path,{method='GET',user='alice',data,requestOrigin=origin}={}) {
    const headers={'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'};
    if(user)headers.Cookie='__Host-hos_session='+user[0].repeat(43);if(requestOrigin)headers.Origin=requestOrigin;
    return worker.fetch(new Request(origin+'/api/community/'+path,{method,headers,body:data?JSON.stringify(data):undefined}),env);
  }
  const input=auditTemplate();input.name='Public entity';input.cutoff='2026-10-02';
  const draft=(await (await call('drafts',{method:'POST',data:{title:'SECRET_DRAFT_TITLE',input,privateNotes:'SECRET_NOTES'}})).json()).draft;
  const run=(await (await call(`drafts/${draft.id}/runs`,{method:'POST',data:{revision:1}})).json()).run;
  async function preview(overrides={}) {const response=await call('public-preview',{method:'POST',data:{runId:run.id,input,author:'Public pseudonym',...overrides}});assert.equal(response.status,200,await response.clone().text());return response.json();}
  async function publish(p,user='alice') {return call('publish',{method:'POST',user,data:{token:p.token,acknowledgement:'PUBLISH_PUBLIC_UNREVIEWED'}});}
  return {sql,env,call,input,draft,run,preview,publish,intercept:fn=>{intercept=fn;}};
}
test('Publication: preview is private; consent publishes exact recomputed content, never private identifiers',async t=>{
  const f=await fixture(t),p=await f.preview();
  assert.equal((await (await f.call('publications',{user:null})).json()).publications.length,0);
  assert.equal((await f.call('publish',{method:'POST',data:{token:p.token}})).status,400);
  assert.equal((await f.publish(p,'bob')).status,409);
  const response=await f.publish(p);assert.equal(response.status,201);const {publication}=await response.json();
  assert.deepEqual(publication.report,p.report);assert.equal(publication.reportHash,await sha256(p.report));
  assert.equal(publication.report.reviewStatus,'UNREVIEWED');assert.equal(publication.report.platformCertification,'NONE');
  const dto=await (await f.call('publications/'+publication.id,{user:null})).json();
  const text=JSON.stringify(dto);for(const secret of ['SECRET_NOTES','SECRET_DRAFT_TITLE',f.draft.id,f.run.id,'owner_id','rawInputHash','oidc_subject'])assert.ok(!text.includes(secret));
  assert.equal((await (await f.publish(p)).json()).publication.id,publication.id);
  const log=await (await f.call('public-log',{user:null})).json();assert.equal(log.events.length,1);assert.equal(log.events[0].kind,'published');
});
test('Publication: stale/expired/blocked previews fail and moderator gate is enforced',async t=>{
  const f=await fixture(t),p=await f.preview();
  f.env.OIDC_ADMIN_SUBJECTS='';assert.equal((await f.publish(p)).status,503);f.env.OIDC_ADMIN_SUBJECTS='not-signed-in';assert.equal((await f.publish(p)).status,503);f.env.OIDC_ADMIN_SUBJECTS='moderator';
  f.sql.exec('UPDATE community_previews SET expires_at=1');assert.equal((await f.publish(p)).status,409);
  const p2=await f.preview();f.sql.exec('UPDATE community_drafts SET revision=revision+1');assert.equal((await f.publish(p2)).status,409);
  assert.equal((await f.call('public-preview',{method:'POST',data:{runId:f.run.id,input:f.input,author:'Author'}})).status,409);
});
test('Publication: concurrent same-token retries create one version; competing preview cannot substitute content',async t=>{
  const f=await fixture(t),p=await f.preview(),other=await f.preview({author:'Different author'});
  const results=await Promise.all([f.publish(p),f.publish(p)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_publications').get().n,1);
  assert.equal((await f.publish(other)).status,409);
});
test('Publication: block or edit at insert time prevents publication',async t=>{
  for(const block of [true,false])await t.test(String(block),async t=>{
    const f=await fixture(t),p=await f.preview();
    f.intercept(()=>f.sql.exec(block?"UPDATE community_users SET blocked=1 WHERE id='alice'":'UPDATE community_drafts SET revision=revision+1'));
    assert.equal((await f.publish(p)).status,409);assert.equal(f.sql.prepare('SELECT count(*) n FROM community_publications').get().n,0);
  });
});
test('Publication: corrections form a series; withdrawal redacts payload/author but preserves hash and event',async t=>{
  const f=await fixture(t),p=await f.preview(),pub=(await (await f.publish(p)).json()).publication;
  assert.equal((await f.call('publications/'+pub.id+'/withdraw',{method:'POST',user:'bob',data:{}})).status,404);
  assert.throws(()=>f.sql.exec("UPDATE community_publications SET title='Changed'"),/cannot be edited/);
  await f.call('drafts/'+f.draft.id,{method:'PUT',data:{title:'Correction',input:{...f.input,name:'Corrected entity'},revision:1}});
  const run=(await (await f.call(`drafts/${f.draft.id}/runs`,{method:'POST',data:{revision:2}})).json()).run;
  const p2=await f.preview({runId:run.id,input:{...f.input,name:'Corrected entity'}});
  const pub2=(await (await f.publish(p2)).json()).publication;assert.equal(pub2.version,2);assert.equal(pub2.seriesId,pub.seriesId);
  const history=await (await f.call('publications/'+pub.id+'/history',{user:null})).json();assert.equal(history.publications.length,2);
  await f.call('publications/'+pub.id+'/withdraw',{method:'POST',data:{}});
  const removed=(await (await f.call('publications/'+pub.id,{user:null})).json()).publication;
  assert.equal(removed.state,'withdrawn');assert.equal(removed.reportHash,pub.reportHash);assert.equal((await (await f.publish(p)).json()).publication.state,'withdrawn');for(const key of ['report','title','author','phase'])assert.equal(key in removed,false);
  const log=await (await f.call('public-log',{user:null})).json();assert.equal(log.events[0].kind,'withdrawn');
  assert.equal((await (await f.call(`drafts/${f.draft.id}/runs/${f.run.id}`)).json()).run.id,f.run.id);
});
test('Publication: reports stay private; moderator hide-and-block redacts and revokes sessions atomically',async t=>{
  const f=await fixture(t),p=await f.preview(),pub=(await (await f.publish(p)).json()).publication;
  await f.call('publications/'+pub.id+'/report',{method:'POST',user:'bob',data:{details:'PRIVATE_REPORT_DETAILS'}});
  assert.equal((await f.call('moderation',{user:'bob'})).status,403);
  const queue=await (await f.call('moderation',{user:'moderator'})).json();assert.equal(queue.reports.length,1);
  const publicText=await (await f.call('public-log',{user:null})).text();assert.ok(!publicText.includes('PRIVATE_REPORT_DETAILS'));
  const id=queue.reports[0].id;
  const replies=await Promise.all([f.call('moderation/'+id,{method:'POST',user:'moderator',data:{action:'hide-and-block',note:'Private action note'}}),f.call('moderation/'+id,{method:'POST',user:'moderator',data:{action:'hide-and-block',note:'Retry'}})]);
  assert.ok(replies.every(r=>r.status===200));assert.equal(f.sql.prepare('SELECT count(*) n FROM community_moderation_actions').get().n,1);
  assert.equal((await f.call('me')).status,401);
  const removed=(await (await f.call('publications/'+pub.id,{user:null})).json()).publication;assert.equal(removed.state,'hidden');assert.equal('report' in removed,false);
});
test('Publication: exact origin, disabled flag, and bounded request validation',async t=>{
  const f=await fixture(t),p=await f.preview();
  assert.equal((await f.call('publish',{method:'POST',data:{token:p.token,acknowledgement:'PUBLISH_PUBLIC_UNREVIEWED'},requestOrigin:'https://evil.example'})).status,403);
  assert.equal((await f.call('public-preview',{method:'POST',data:{runId:f.run.id,input:f.input,author:'A',ownerId:'bob'}})).status,400);
  assert.equal((await f.call('publications?after=NaN',{user:null})).status,400);
  f.env.COMMUNITY_ENABLED='false';assert.equal((await f.call('publications',{user:null})).status,503);
});

test('Publication: public candidate is recomputed without private hashes or diagnostic fields',async t=>{
  const f=await fixture(t),candidate={...f.input,report:{phase:'FAKE'},answers:[false,true,false,true,false].map(value=>({value,source:'',date:'',notes:'',gap:'No public evidence submitted.'})),headerText:'',publicKeyText:''};
  const p=await f.preview({input:candidate});assert.equal(p.report.result.phase,'NAB');assert.equal('rawInputHash' in p.report,false);assert.equal(p.report.publicInputHash,await sha256(p.report.input));assert.ok(!JSON.stringify(p.report).includes('FAKE'));
});
test('Publication: failed moderation batch rolls back redaction, block, revocation and resolution',async t=>{
  const f=await fixture(t),p=await f.preview(),pub=(await (await f.publish(p)).json()).publication;
  await f.call('publications/'+pub.id+'/report',{method:'POST',user:'bob',data:{details:'Concern'}});
  const queue=await (await f.call('moderation',{user:'moderator'})).json();
  f.sql.exec("CREATE TRIGGER fail_action BEFORE INSERT ON community_moderation_actions BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  assert.equal((await f.call('moderation/'+queue.reports[0].id,{method:'POST',user:'moderator',data:{action:'hide-and-block',note:''}})).status,503);
  assert.equal((await f.call('me')).status,200);assert.equal(f.sql.prepare('SELECT state FROM community_reports').get().state,'open');
  assert.equal((await (await f.call('publications/'+pub.id,{user:null})).json()).publication.state,'published');
});

test('Publication: public feed/history/log and author listing have stable bounded pages',async t=>{
  const f=await fixture(t),p=await f.preview(),pub=(await (await f.publish(p)).json()).publication;
  const row=f.sql.prepare('SELECT * FROM community_publications').get();
  const keys=Object.keys(row).filter(k=>k!=='seq');const insert=f.sql.prepare(`INSERT INTO community_publications(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`);
  for(let i=2;i<=60;i++){const next={...row,id:crypto.randomUUID(),preview_hash:crypto.randomUUID(),revision:i,version:i};insert.run(...keys.map(k=>next[k]));}
  for(const [path,key,size] of [['publications','publications',25],['publications/'+pub.id+'/history','publications',25],['public-log','events',50],['my-publications','publications',25]]){
    const first=await (await f.call(path,{user:path==='my-publications'?'alice':null})).json();assert.equal(first[key].length,size);assert.ok(first.nextCursor);
    const second=await (await f.call(path+'?after='+first.nextCursor,{user:path==='my-publications'?'alice':null})).json();
    const ids=new Set([...first[key],...second[key]].map(v=>v.id||v.seq));assert.equal(ids.size,first[key].length+second[key].length);
  }
});
test('Publication: moderator becoming blocked at insert also closes the publication gate',async t=>{
  const f=await fixture(t),p=await f.preview();f.intercept(()=>f.sql.exec("UPDATE community_users SET blocked=1 WHERE id='moderator'"));
  assert.equal((await f.publish(p)).status,409);assert.equal(f.sql.prepare('SELECT count(*) n FROM community_publications').get().n,0);
});
