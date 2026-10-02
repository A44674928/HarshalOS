# 🧜 MERMAID DIAGRAM EXAMPLES

> **ARCHIVE / SUPERSEDED NUMBERS — NOT AN ENGINEERING OR IMPLEMENTATION SPECIFICATION.** This file preserves earlier fictional concept material (`FICTION`, `NARRATIVE_SANDBOX`). Its dates, elevations, flow rates, water volumes, energy totals, costs, completion claims, and implementation assertions are not current or validated. Use the reconciled assumptions in [CANONICAL-NUMBERS.md](./CANONICAL-NUMBERS.md); use [`recalculate.py`](./recalculate.py) for current arithmetic. This repository contains no construction authorization, feasibility finding, water allocation, permit, or evidence of physical implementation.


**What is Mermaid?**  
Mermaid is a **text-based diagramming and charting tool** that allows you to create visualizations using simple, readable syntax. It's commonly used in Markdown documents (like this one) to generate flowcharts, sequence diagrams, Gantt charts, class diagrams, state diagrams, and more.

Mermaid diagrams render automatically in many documentation platforms (GitHub, GitLab, VS Code with Mermaid plugin, etc.) and provide a way to create professional visualizations without needing design software.

---

## 📊 EXAMPLE 1: SIMPLE FLOWCHART

Here's a basic flowchart showing the water flow in the Grand River Hyperstructure:

```mermaid
flowchart TD
    A[Tier 3: Dammed Inland Sea\n-900m, 25,000 m³/s] -->|Gravity Flow| B[Tier 2: Reservoir & Processing\n-400m, 20,000 m³/s]
    B -->|Processed Water| C[Tier 1: Municipal Distribution\n+1,200m, 15,000 m³/s]
    
    style A fill:#0066cc,stroke:#003399,stroke-width:3px,color:#ffffff
    style B fill:#009966,stroke:#006633,stroke-width:3px,color:#ffffff
    style C fill:#cc6600,stroke:#994400,stroke-width:3px,color:#ffffff
```

*This would render as a vertical flowchart showing water flowing from Tier 3 to Tier 2 to Tier 1.*

---

## 📊 EXAMPLE 2: GRAND RIVER WATER FLOW DIAGRAM

```mermaid
flowchart TB
    subgraph Tier_3["Tier 3: Deep Core (-600m to -900m)"]
        DIS[Dammed Inland Sea\nNode: 0178-0181]
        DWI[Deep Water Intake\nNode: 0250]
        UEC[Underwater Energy Capture]
    end
    
    subgraph Tier_2["Tier 2: Reservoir (-200m to -400m)"]
        GRD[Grand River Turbines\nNode: 0091]
        DES[Desalination Plant\nNode: 0156]
        SMR[SMR Array\nNode: 0248]
        CRF[Current Redirection\nNode: 0249]
        FWB[Freshwater Basin\nNode: 0175]
        CSR[Canyon de Chelly\nSaltwater Reserve\nNode: 0176]
    end
    
    subgraph Tier_1["Tier 1: Capitol (+0m to +1,200m)"]
        MDP[Municipal Distribution\nNode: 0155]
        BRF[Bottling Refineries\nNode: 0195-0199]
        OWH[On-Water Hospitality\nNode: 0189, 0193]
    end
    
    DIS -->|25,000 m³/s| DWI
    DWI -->|Raw Water| GRD
    DWI -->|Raw Water| DES
    GRD -->|Power Generation| SMR
    GRD -->|Flow Control| CRF
    DES -->|Freshwater| FWB
    FWB -->|Processed| MDP
    CSR -->|Saltwater| DES
    MDP -->|Distribution| BRF
    MDP -->|Distribution| OWH
    
    style Tier_3 fill:#111122,stroke:#333366,stroke-width:2px
    style Tier_2 fill:#112211,stroke:#336633,stroke-width:2px
    style Tier_1 fill:#221111,stroke:#663333,stroke-width:2px
```

*This shows the complete water flow with specific node references.*

---

## 📊 EXAMPLE 3: STAKEHOLDER ACCESS FLOW

```mermaid
flowchart LR
    subgraph Public["Public Access (L0)"]
        TOUR[Tourists\n0318-0336]
        RES[Residents\n0336]
    end
    
    subgraph General["General Access (L1)"]
        MUN[Municipalities\n0318-0335]
        COM[Commercial\n0280-0317]
        MED[Media\n0162-0164]
    end
    
    subgraph Operational["Operational (L2)"]
        CON[Construction\n0145-0154]
        AQC[Aquaculture\n0235-0246]
    end
    
    subgraph Research["Research (L3)"]
        SCI[Scientists\n0262-0279]
        ENG[Engineers\n0146-0148]
    end
    
    subgraph Defense["Defense (L4)"]
        MIL[Military\n0130-0137]
        INT[Intelligence\n0127-0129]
    end
    
    subgraph AI["AI Core (L5)"]
        AIC[AI Companies\n0179-0181]
        ISH[Inner Shell\n0180]
    end
    
    subgraph Emergency["Emergency (L6)"]
        EMS[Emergency Services\n0260-0261]
    end
    
    TOUR -->|Access| T1
    RES -->|Access| T1
    MUN -->|Access| T1
    COM -->|Access| T1
    MED -->|Access| T1
    CON -->|Access| T1
    CON -->|Access| T2
    AQC -->|Access| T2
    SCI -->|Access| T1
    SCI -->|Access| T2
    SCI -->|Limited| T3
    ENG -->|Access| T1
    ENG -->|Access| T2
    MIL -->|Access| T1
    MIL -->|Access| T2
    MIL -->|Access| T3
    INT -->|Access| T1
    INT -->|Access| T2
    INT -->|Access| T3
    AIC -->|Access| T3
    ISH -->|Access| T3
    EMS -->|Override| T1
    EMS -->|Override| T2
    EMS -->|Override| T3
    
    T1[("Tier 1: Capitol")]
    T2[("Tier 2: Reservoir")]
    T3[("Tier 3: Deep Core")]
```

*This shows how different access levels map to tier access.*

---

## 📊 EXAMPLE 4: MOBILITY SYSTEM DIAGRAM

```mermaid
flowchart TD
    subgraph Vertical["Vertical Transit"]
        HSE[High-Speed Elevator\n12 m/s, 50 people]
        SE[Standard Elevator\n4 m/s, 20 people]
        CS[Canoo Submersible\n3 m/s, 8 people]
        TT[Transit Tunnel\n8 m/s, 200 people]
        EAS[Emergency Ascent\n15 m/s, 10 people]
    end
    
    subgraph Horizontal["Horizontal Circulation"]
        RL[Rim Loop\n~30km circumference]
        AC[Airship Corridors\nHeavy lift]
        CG[Canoo Ground Fleet\nAmphibious]
        ST[Submerged Tunnels\nPressurized]
        CU[Canoo Underwater\nAutonomous]
        SL[Submersible Lanes\nDeep core]
    end
    
    T1((Tier 1)) -->|HSE| T2((Tier 2))
    T1 -->|SE| T2
    T1 -->|CG| T1
    T1 -->|AC| T1
    T1 -->|RL| T1
    
    T2 -->|CS| T3((Tier 3))
    T2 -->|TT| T3
    T2 -->|ST| T2
    T2 -->|CU| T2
    
    T3 -->|SL| T3
    
    EAS -->|Emergency| T1
    EAS -->|Emergency| T2
    EAS -->|Emergency| T3
```

*This shows the complete mobility infrastructure.*

---

## 📊 EXAMPLE 5: GANTT CHART (Implementation Timeline)

```mermaid
gantt
    title Grand River Hyperstructure - Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Foundation
    Project Setup           :a1, 2026-10-02, 1w
    Site Preparation        :a2, after a1, 2w
    Tier 3 Foundation       :a3, after a2, 3w
    Tier 2 Foundation       :a4, after a3, 3w
    Tier 1 Foundation       :a5, after a4, 3w
    Initial Water Flow      :a6, after a5, 2w
    
    section Phase 2: Core Systems
    Hydroelectric Power    :b1, 2026-12-27, 4w
    Nuclear Power          :b2, after b1, 4w
    Water Processing       :b3, after b2, 3w
    Energy Distribution     :b4, after b3, 3w
    
    section Phase 3: Stakeholder Integration
    Tier 1 Onboarding       :c1, 2027-02-21, 4w
    Tier 2 Onboarding       :c2, after c1, 4w
    Tier 3 Onboarding       :c3, after c2, 4w
    Access Control          :c4, after c3, 4w
    
    section Phase 4: Optimization
    Flow Optimization      :d1, 2027-04-25, 4w
    Energy Optimization     :d2, after d1, 4w
    Mobility Optimization   :d3, after d2, 4w
    
    section Phase 5: Expansion
    Facility Addition      :e1, 2027-06-16, 8w
    Technology Upgrades     :e2, after e1, 8w
```

*This shows the 5-phase implementation timeline.*

---

## 📊 EXAMPLE 6: CLASS DIAGRAM (System Components)

```mermaid
classDiagram
    class Tier {
        +String name
        +int elevationMin
        +int elevationMax
        +List~Stakeholder~ stakeholders
        +List~WaterSystem~ waterSystems
        +List~MobilitySystem~ mobilitySystems
        +accessControl()
    }
    
    class WaterSystem {
        +String type
        +double flowRate
        +double pressure
        +double temperature
        +processWater()
    }
    
    class MobilitySystem {
        +String type
        +double speed
        +int capacity
        +String accessLevel
        +transport()
    }
    
    class Stakeholder {
        +String nodeId
        +String name
        +String category
        +String accessLevel
        +List~String~ permissions
        +operate()
    }
    
    Tier "1" *-- "0..*" WaterSystem : contains
    Tier "1" *-- "0..*" MobilitySystem : contains
    Tier "1" *-- "0..*" Stakeholder : hosts
    
    class Tier1{
        +String name = "Capitol & Rim"
        +int elevationMin = 0
        +int elevationMax = 1200
    }
    
    class Tier2{
        +String name = "Reservoir & Biosphere"
        +int elevationMin = -400
        +int elevationMax = -200
    }
    
    class Tier3{
        +String name = "Deep Core"
        +int elevationMin = -900
        +int elevationMax = -600
    }
    
    Tier <|-- Tier1
    Tier <|-- Tier2
    Tier <|-- Tier3
```

*This shows the object-oriented structure of the hyperstructure.*

---

## 📊 EXAMPLE 7: STATE DIAGRAM (Water Flow States)

```mermaid
stateDiagram-v2
    [*] --> RawWater
    
    state RawWater {
        [*] --> InDam
        InDam --> Intake: Intake Manifolds
    }
    
    state ProcessedWater {
        [*] --> InReservoir
        InReservoir --> InTreatment: Enter Treatment
        InTreatment --> InDesalination: Desalination
        InDesalination --> InPurification: Purification
        InPurification --> InStorage: Storage
    }
    
    state DistributedWater {
        [*] --> InPipeline
        InPipeline --> InMunicipal: Municipal Distribution
        InPipeline --> InBottling: Bottling Refineries
        InPipeline --> InHospitality: Hospitality Supply
    }
    
    RawWater --> ProcessedWater: Tier 3 → Tier 2
    ProcessedWater --> DistributedWater: Tier 2 → Tier 1
    DistributedWater --> [*]
```

*This shows the state transitions of water as it flows through the system.*

---

## 📊 EXAMPLE 8: PIE CHART (Stakeholder Distribution)

```mermaid
pie
    title Stakeholder Distribution by Tier
    "Tier 1: Capitol & Rim" : 180
    "Tier 2: Reservoir" : 120
    "Tier 3: Deep Core" : 60
```

*This shows the distribution of stakeholders across tiers.*

---

## 📊 EXAMPLE 9: COMPLEX FLOWCHART (Complete System)

```mermaid
flowchart TB
    subgraph Legend
        WF[("Water Flow")]
        MF[("Mobility Flow")]
        EF[("Energy Flow")]
        SF[("Stakeholder")]
    end
    
    subgraph "Tier 3: Deep Core (-600m to -900m)"
        DIS((Dammed Inland Sea))
        DWI[Deep Water Intake]
        UEC[Underwater Energy Capture]
        ISH[Inner Shell\n0180]
        MNB[Marine Base\n0133]
        S7[Section 7\n0268]
    end
    
    subgraph "Tier 2: Reservoir (-200m to -400m)"
        GRD[Grand River Turbines\n0091]
        DES[Desalination\n0156]
        SMR[SMR Array\n0248]
        CRF[Current Redirection\n0249]
        FWB[Freshwater Basin\n0175]
        CDCS[Canyon de Chelly\n0176]
        IMTA[IMTA Hubs\n0235]
    end
    
    subgraph "Tier 1: Capitol (+0m to +1,200m)"
        NCB[New Capitol\n0113]
        MDP[Municipal Distribution\n0155]
        BRF[Bottling\n0195-0199]
        OSP[Olympic Stadium\n0221]
        SET[Sunset Egg\n0093]
    end
    
    %% Water Flow (Blue)
    DIS -->|25,000 m³/s| DWI
    DWI -->|Raw Water| GRD
    DWI -->|Raw Water| DES
    GRD -->|Flow| CRF
    DES -->|Freshwater| FWB
    CDCS -->|Saltwater| DES
    FWB -->|Processed| MDP
    MDP -->|Distribution| BRF
    
    %% Energy Flow (Orange)
    GRD -->|1.8 GW| SMR
    SMR -->|0.7 GW| UEC
    UEC -->|0.2 GW| SMR
    
    %% Mobility Flow (Green)
    T1((Tier 1)) -->|Elevators| T2((Tier 2))
    T2 -->|Canoo/Transit| T3((Tier 3))
    T3 -->|Emergency| T1
    
    %% Stakeholders (Purple)
    ISH -.-> T3
    MNB -.-> T3
    S7 -.-> T3
    GRD -.-> T2
    DES -.-> T2
    SMR -.-> T2
    NCB -.-> T1
    MDP -.-> T1
    BRF -.-> T1
    
    style WF fill:#e6f3ff,stroke:#0066cc
    style MF fill:#e6ffe6,stroke:#00cc00
    style EF fill:#ffe6e6,stroke:#cc0000
    style SF fill:#f3e6ff,stroke:#6600cc
```

*This is a comprehensive diagram showing water flow, energy flow, mobility flow, and stakeholder placement.*

---

## 💡 HOW TO USE MERMAID

### In GitHub/GitLab:
Simply include Mermaid syntax in your Markdown files. The platform will automatically render the diagrams.

### In VS Code:
1. Install the **Mermaid extension** (by bierner)
2. Create a `.mmd` file or use Markdown with Mermaid code blocks
3. The extension will render the diagrams in a preview pane

### In Other Platforms:
Many documentation tools support Mermaid natively, including:
- Notion (with Mermaid plugin)
- Obsidian (with Mermaid plugin)
- Typora
- Docusaurus
- MkDocs with Mermaid plugin

### Online Editors:
- [Mermaid Live Editor](https://mermaid.live/) - Test and visualize your diagrams
- [Mermaid Chart](https://www.mermaidchart.com/) - Create and share diagrams

---

## 📚 MERMAID SYNTAX REFERENCE

### Basic Structure
```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
```

### Node Types
```mermaid
flowchart TD
    A[Rectangle]
    B(Rounded)
    C>Stadium]
    D{Decision}
    E((Circle))
    F[[Subroutine]]
```

### Connections
```mermaid
flowchart TD
    A --> B
    A --- B
    A -.- B
    A -.-> B
    A ==> B
    A -- Text --> B
```

### Styling
```mermaid
flowchart TD
    A[Node]:::className
    
    classDef className fill:#f9f,stroke:#333,stroke-width:2px,color:#000
```

### Themes
```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#ff0000'}}}%%
flowchart TD
    A --> B
```

---

## 🎯 WHY MERMAID IS USEFUL

1. **Text-Based:** Easy to version control and collaborate on
2. **Platform-Agnostic:** Works across many documentation platforms
3. **Quick to Learn:** Simple syntax that's easy to understand
4. **Maintainable:** Easier to update than binary diagram files
5. **Consistent:** Always renders the same way given the same code
6. **Accessible:** Can be read as text if diagrams don't render

---

## 📁 SAVING MERMAID DIAGRAMS

To save Mermaid diagrams as images:
1. Use the [Mermaid Live Editor](https://mermaid.live/)
2. Paste your Mermaid code
3. Click "Download" to save as SVG or PNG
4. Or use command-line tools like `mermaid-cli`

---

**Would you like me to create a specific Mermaid diagram for the Grand River Hyperstructure, or would you like to see more examples of different diagram types?**
