/* ═══════════════════════════════════════════════════════════════
   HarshalOS — compose the OCM route model with optional NAB/AGS evaluation.

   Pure adapter: all address and resolution-path semantics come from the
   existing OCM directory API (js/ocm-directory.js). This module adds no
   network, transport, storage, identity, authority, or execution capability.

   Coordination is never sent to AGS and never carries authority. An
   authoritative-action route is marked resolved only when it takes the OCM
   resolution path. AGS evaluation is opt-in per call; internal research is not
   routed or gated here. A modeled Permit remains a model output only.
   ═══════════════════════════════════════════════════════════════ */

export const COORDINATION = "COORDINATION";
export const AUTHORITATIVE_ACTION = "AUTHORITATIVE-ACTION";
export const VIA_CENTER = "VIA-CENTER";
export const DIRECT_LATERAL = "DIRECT-LATERAL";

const NO_EFFECT = Object.freeze({
  authorityEffect: "NONE",
  transport: "NONE",
  delivery: "NOT-ATTEMPTED",
  execution: "NOT-ATTEMPTED"
});

const freeze = value => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
};

const refusal = (code, reason, extra = {}) => freeze({
  ok: false,
  status: "REFUSED",
  code,
  reason,
  ...NO_EFFECT,
  ...extra
});

function routeContext(directory, request) {
  if (!directory || typeof directory.validateAddress !== "function" || typeof directory.planRoute !== "function") {
    return { error: refusal("NAB-OCM-DIRECTORY-UNAVAILABLE", "The OCM directory API is not available; no route was evaluated.") };
  }

  const route = request.route === undefined ? VIA_CENTER : request.route;
  if (route !== VIA_CENTER && route !== DIRECT_LATERAL) {
    return { error: refusal("NAB-OCM-ROUTE-INVALID", "Choose VIA-CENTER or DIRECT-LATERAL.") };
  }

  let plan;
  try {
    plan = directory.planRoute({ from: request.from, to: request.to, recipients: request.recipients });
  } catch {
    return { error: refusal("NAB-OCM-ROUTE-FAILED", "The OCM route planner failed; no route was evaluated.") };
  }
  if (!plan || plan.ok !== true) {
    return { error: refusal(
      plan?.code || "NAB-OCM-ADDRESS-INVALID",
      plan?.reason || "The source or destination is not a valid OCM peer address.",
      plan?.field ? { field: plan.field } : {}
    ) };
  }

  const resolutionTraversed = route === VIA_CENTER;
  const context = {
    from: plan.from,
    to: plan.to,
    route,
    resolution: resolutionTraversed ? "TRAVERSED" : "NOT-TRAVERSED",
    resolutionTraversed,
    path: resolutionTraversed ? plan.path : Object.freeze([]),
    center: plan.center,
    centerRole: resolutionTraversed ? plan.centerRole : "BYPASSED",
    authoritySource: plan.authoritySource,
    comparison: Object.freeze({
      resolutionFirstVerificationHops: plan.verification.resolutionFirst,
      directLateralVerificationHops: plan.verification.directLateral,
      lateralArcDegrees: plan.verification.lateralArcDegrees,
      savedVerificationHops: plan.verification.savedHops
    })
  };
  return { context: freeze(context) };
}

/**
 * Evaluate an OCM/NAB route model without communicating or executing.
 *
 * request: {
 *   kind: COORDINATION | AUTHORITATIVE_ACTION,
 *   from, to: OCM peer addresses,
 *   route?: VIA-CENTER | DIRECT-LATERAL,
 *   action?: non-empty string (for AUTHORITATIVE_ACTION),
 *   recipients?: positive integer
 * }
 * options: {
 *   agsSelected?: true, agsProfile, agsState, gate(state, profile)
 * }
 *
 * Coordination is always route-only. For an authoritative action, OCM's
 * resolution-path precondition is checked first. A project may explicitly
 * select an AGS profile for the subsequent model evaluation; absent that
 * selection, the route is only a plan and the gate is not called.
 */
export function evaluateRouteRequest(directory, request = {}, options = {}) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return refusal("NAB-OCM-REQUEST-INVALID", "A route request object is required.");
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) options = {};

  const kind = request.kind;
  if (kind !== COORDINATION && kind !== AUTHORITATIVE_ACTION) {
    return refusal("NAB-OCM-KIND-INVALID", "Request kind must be COORDINATION or AUTHORITATIVE-ACTION.");
  }

  const route = routeContext(directory, request);
  if (route.error) return route.error;
  const context = route.context;

  if (kind === COORDINATION) {
    return freeze({
      ok: true,
      status: "COORDINATION-ONLY",
      kind,
      ...context,
      ags: Object.freeze({ selected: false, evaluated: false, decision: "NOT-APPLICABLE" }),
      ...NO_EFFECT
    });
  }

  const rawAction = typeof request.action === "string" ? request.action.trim() : "";
  if (!rawAction) {
    return refusal("NAB-OCM-ACTION-REQUIRED", "An authoritative-action preview requires a non-empty action name.", {
      kind,
      ...context,
      ags: Object.freeze({ selected: options.agsSelected === true, evaluated: false, decision: "NOT-EVALUATED" })
    });
  }
  if (rawAction.length > 128) {
    return refusal("NAB-OCM-ACTION-TOO-LONG", "Action names are limited to 128 characters.", {
      kind,
      ...context,
      ags: Object.freeze({ selected: options.agsSelected === true, evaluated: false, decision: "NOT-EVALUATED" })
    });
  }
  const action = rawAction;

  if (!context.resolutionTraversed) {
    return refusal("NAB-OCM-RESOLUTION-REQUIRED",
      "This OCM action route has not traversed Center Origin resolution; AGS was not evaluated. Lateral coordination remains available, but it cannot authorize, override, or commit state.", {
        kind,
        action,
        ...context,
        ags: Object.freeze({ selected: options.agsSelected === true, evaluated: false, decision: "NOT-EVALUATED" })
      });
  }

  if (options.agsSelected !== true) {
    return freeze({
      ok: true,
      status: "RESOLUTION-PLAN-READY",
      kind,
      action,
      ...context,
      ags: Object.freeze({ selected: false, evaluated: false, decision: "NOT-SELECTED" }),
      ...NO_EFFECT
    });
  }

  if (!options.agsProfile || typeof options.gate !== "function") {
    return refusal("NAB-OCM-AGS-PROFILE-INCOMPLETE",
      "An explicitly selected AGS preview requires both a profile and a gate evaluator; no action was evaluated.", {
        kind,
        action,
        ...context,
        ags: Object.freeze({ selected: true, evaluated: false, decision: "NOT-EVALUATED" })
      });
  }

  let decision;
  try {
    decision = options.gate(options.agsState, options.agsProfile);
  } catch {
    return refusal("NAB-OCM-AGS-EVALUATION-FAILED", "The selected AGS model could not evaluate this request.", {
      kind,
      action,
      ...context,
      ags: Object.freeze({ selected: true, evaluated: false, decision: "ERROR" })
    });
  }
  if (!decision || (decision.x !== "Permit" && decision.x !== "Refuse")) {
    return refusal("NAB-OCM-AGS-RESULT-INVALID", "The selected AGS model returned no recognized Permit or Refuse result.", {
      kind,
      action,
      ...context,
      ags: Object.freeze({ selected: true, evaluated: false, decision: "INVALID-RESULT" })
    });
  }

  const ags = Object.freeze({
    selected: true,
    evaluated: true,
    decision: decision.x,
    S: Number.isFinite(decision.S) ? decision.S : null,
    L: Number.isFinite(decision.L) ? decision.L : null,
    failures: Object.freeze(Array.isArray(decision.failures)
      ? decision.failures.filter(item => typeof item === "string")
      : [])
  });
  return freeze({
    ok: true,
    status: decision.x === "Permit" ? "AGS-MODELED-PERMIT" : "AGS-MODELED-REFUSAL",
    kind,
    action,
    ...context,
    ags,
    ...NO_EFFECT
  });
}
