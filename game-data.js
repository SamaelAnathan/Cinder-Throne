
window.GAME_DATA = {
  version: "0.2.0",

  resources: {
    provisions:{name:"Provisions"},
    alloy:{name:"Alloy"},
    fuel:{name:"Reactor Fuel"},
    data:{name:"Archive Data"},
    authority:{name:"Authority"},
    relics:{name:"Relics"}
  },

  units: {
    agriVault:{
      group:"industry",name:"Agri-Vault",desc:"Sealed hydroponic complexes that feed the war machine.",
      baseCost:{provisions:20,alloy:8},growth:1.155,produces:{provisions:1.15},power:0
    },
    smelter:{
      group:"industry",name:"Smelter Stack",desc:"Ore furnaces and salvage yards producing structural alloy.",
      baseCost:{provisions:60,alloy:22},growth:1.165,produces:{alloy:0.55},consumes:{provisions:0.025},power:0
    },
    reactorStill:{
      group:"industry",name:"Reactor Still",desc:"Cracks volatile feedstock into high-density reactor fuel.",
      baseCost:{provisions:130,alloy:70},growth:1.17,produces:{fuel:0.24},consumes:{provisions:0.035},
      unlock:"deep_bore",power:0
    },
    archiveNode:{
      group:"industry",name:"Archive Node",desc:"Machine archivists collate logistics, combat and archaeological data.",
      baseCost:{alloy:170,fuel:30},growth:1.18,produces:{data:0.14},consumes:{fuel:0.012},
      unlock:"machine_index",power:0
    },
    musterHall:{
      group:"industry",name:"Muster Hall",desc:"Recruitment and indoctrination bureaux continuously raise Ash Levy.",
      baseCost:{provisions:500,alloy:250,authority:40},growth:1.19,producesUnits:{ashLevy:0.015},
      consumes:{provisions:0.08},unlock:"mass_mobilisation",power:0
    },
    warFoundry:{
      group:"industry",name:"War Foundry",desc:"A vertically integrated military production district.",
      baseCost:{alloy:1000,fuel:300,data:120},growth:1.20,
      produces:{alloy:3.1,fuel:0.42},consumes:{provisions:0.12},unlock:"total_war",power:0
    },
    geneVault:{
      group:"industry",name:"Gene-Vault",desc:"Restricted biotechnical complexes cultivate rare transhuman cadres.",
      baseCost:{alloy:8000,fuel:2700,data:3500,authority:5000},growth:1.21,
      producesUnits:{geneKnight:0.00022},consumes:{fuel:0.32,data:0.06},unlock:"gene_sanction",power:0
    },

    ashLevy:{
      group:"forces",name:"Ash Levy",desc:"Mass infantry raised from foundry districts and frontier settlements.",
      baseCost:{provisions:28,authority:2},growth:1.16,produces:{authority:0.025},consumes:{provisions:0.008},power:1
    },
    steelCohort:{
      group:"forces",name:"Steel Cohort",desc:"Disciplined professional infantry with sealed armour and heavy support.",
      baseCost:{provisions:120,alloy:28,authority:12},growth:1.175,
      produces:{authority:0.085},consumes:{provisions:0.018},unlock:"cohort_discipline",power:5
    },
    breachGuard:{
      group:"forces",name:"Breach Guard",desc:"Armoured shock troops designed for boarding, siege and urban assault.",
      baseCost:{provisions:420,alloy:190,fuel:40,authority:60},growth:1.185,
      produces:{authority:0.24},consumes:{provisions:0.03,fuel:0.018},unlock:"carapace_frames",power:22
    },
    geneKnight:{
      group:"forces",name:"Gene-Knight",desc:"Rare gene-wrought warriors capable of surviving otherwise impossible battles.",
      baseCost:{provisions:2500,alloy:1400,fuel:350,data:300,authority:800},growth:1.20,
      produces:{authority:0.95},consumes:{provisions:0.055,fuel:0.07},unlock:"gene_sanction",power:120
    },
    siegeWalker:{
      group:"forces",name:"Siege Walker",desc:"Cathedral-scale walking armour used to break fortress lines.",
      baseCost:{alloy:12000,fuel:4200,data:1800,authority:2600},growth:1.205,
      consumes:{fuel:0.22},unlock:"walking_arsenal",power:480
    },

    picket:{
      group:"fleet",name:"Picket Cutter",desc:"Small voidcraft used for patrol, interception and convoy defence.",
      baseCost:{alloy:650,fuel:220,data:90,authority:100},growth:1.18,
      produces:{relics:0.002},consumes:{fuel:0.035},unlock:"void_command",power:35
    },
    lineFrigate:{
      group:"fleet",name:"Line Frigate",desc:"Long-range warship carrying strike craft, mass drivers and marine detachments.",
      baseCost:{alloy:5200,fuel:1900,data:750,authority:1100},growth:1.195,
      produces:{relics:0.011},consumes:{fuel:0.12},unlock:"fleet_logistics",power:220
    },
    bastionShip:{
      group:"fleet",name:"Bastion Ship",desc:"A mobile fortress whose guns can decide planetary campaigns.",
      baseCost:{alloy:42000,fuel:16000,data:8200,authority:15000,relics:35},growth:1.21,
      produces:{authority:2.3,relics:0.05},consumes:{fuel:0.55},unlock:"bastion_keels",power:1400
    }
  },

  research: {
    cohort_discipline:{
      name:"Cohort Discipline",desc:"Unlock Steel Cohorts and improve ground-force Authority output by 10%.",
      cost:{data:12,authority:15}
    },
    deep_bore:{
      name:"Deep-Bore Extraction",desc:"Unlock Reactor Stills and increase fuel output by 10%.",
      cost:{data:24,alloy:75}
    },
    machine_index:{
      name:"Machine Index",desc:"Unlock Archive Nodes and increase Archive Data output by 15%.",
      cost:{data:38,fuel:25},requires:["deep_bore"]
    },
    carapace_frames:{
      name:"Carapace Frames",desc:"Unlock Breach Guard and increase ground-force combat power by 8%.",
      cost:{data:95,authority:110,alloy:260},requires:["cohort_discipline"]
    },
    mass_mobilisation:{
      name:"Mass Mobilisation",desc:"Unlock Muster Halls that automatically generate Ash Levy.",
      cost:{data:130,authority:220,alloy:500},requires:["cohort_discipline","machine_index"]
    },
    void_command:{
      name:"Void Command",desc:"Unlock Picket Cutters and permit interplanetary campaign operations.",
      cost:{data:220,authority:350,fuel:280},requires:["machine_index"]
    },
    total_war:{
      name:"Total War Economy",desc:"Unlock War Foundries and improve all industrial output by 20%.",
      cost:{data:320,alloy:1500,fuel:500,authority:600},requires:["mass_mobilisation"]
    },
    fleet_logistics:{
      name:"Fleet Logistics",desc:"Unlock Line Frigates and reduce fleet fuel consumption by 15%.",
      cost:{data:750,alloy:3500,fuel:1100,authority:1700},requires:["void_command","total_war"]
    },
    archive_prediction:{
      name:"Archive Prediction",desc:"Threat escalation slows by 20%.",
      cost:{data:1100,authority:2400},requires:["machine_index","carapace_frames"]
    },
    walking_arsenal:{
      name:"Walking Arsenal",desc:"Unlock Siege Walkers and improve ground combat power by a further 12%.",
      cost:{data:1800,alloy:9000,fuel:2500,authority:6500},requires:["carapace_frames","total_war"]
    },
    quartermaster_core:{
      name:"Quartermaster Core",desc:"Unlock automatic purchasing of affordable units.",
      cost:{data:2300,authority:4500},requires:["total_war"]
    },
    gene_sanction:{
      name:"Gene-Sanction",desc:"Unlock Gene-Knights and Gene-Vaults.",
      cost:{data:5000,authority:9000,relics:12},requires:["walking_arsenal","archive_prediction"]
    },
    bastion_keels:{
      name:"Bastion Keels",desc:"Unlock Bastion Ships and increase fleet combat power by 15%.",
      cost:{data:9000,alloy:45000,fuel:14000,authority:24000,relics:50},requires:["fleet_logistics","gene_sanction"]
    },
    relic_analysis:{
      name:"Relic Analysis",desc:"Relic recovery from fleets is increased by 50%.",
      cost:{data:12000,authority:28000,relics:90},requires:["bastion_keels"]
    },
    translation_matrix:{
      name:"Translation Matrix",desc:"Required to conclude the first campaign and begin sector progression.",
      cost:{data:450,authority:800,fuel:500},requires:["void_command"]
    },
    deep_archive:{
      name:"Deep Archive",desc:"Unlocks advanced legacy retention after campaign resets.",
      cost:{data:22000,authority:50000,relics:150},requires:["relic_analysis"]
    }
  },

  doctrine: {
    logistics:{name:"Logistics Primacy",desc:"+18% all positive resource production per rank.",base:2,max:12},
    veterans:{name:"Veteran Muster",desc:"Each new campaign starts with +8 Ash Levy and +1 Smelter per rank.",base:3,max:8},
    archive:{name:"Sealed Archive",desc:"Retain 8% of Archive Data after translation per rank.",base:4,max:8},
    creed:{name:"Command Creed",desc:"+20% Authority generation per rank.",base:3,max:12},
    conquest:{name:"Doctrine of Conquest",desc:"+12% combat power per rank.",base:5,max:10},
    salvage:{name:"Relic Mandate",desc:"+25% Relic recovery per rank.",base:5,max:8}
  },

  sectors: [
    {
      name:"Ashfall Reach",desc:"A dead industrial moon under intermittent corsair attack.",
      req:{authority:180,alloy:550,power:55},legacy:1,
      threat:{name:"Corsair Raids",base:18,growth:0.010},
      mods:{industry:1.00,forces:1.00,fleet:1.00}
    },
    {
      name:"Cinder Marches",desc:"A furnace world whose ash storms punish fuel-starved armies.",
      req:{authority:1200,alloy:3000,fuel:800,power:260},legacy:2,
      threat:{name:"Ash Reavers",base:75,growth:0.022},
      mods:{industry:1.12,forces:0.95,fleet:1.00}
    },
    {
      name:"Gallowspire",desc:"A hive planet fractured by insurgency and failing life-support.",
      req:{authority:6500,alloy:13000,data:1800,power:1200},legacy:4,
      threat:{name:"Spire Insurgency",base:330,growth:0.055},
      mods:{industry:0.96,forces:1.12,fleet:0.98}
    },
    {
      name:"Glass Wastes",desc:"A vitrified world containing pre-collapse ruins and lethal machine fauna.",
      req:{authority:22000,data:6500,relics:20,power:5200},legacy:7,
      threat:{name:"Machine Fauna",base:1450,growth:0.13},
      mods:{industry:1.08,forces:0.92,fleet:1.05}
    },
    {
      name:"Orison Vault",desc:"A buried shrine-complex whose archive engines refuse all modern authority.",
      req:{authority:70000,data:18000,relics:70,power:18000},legacy:11,
      threat:{name:"Vault Sentinels",base:6200,growth:0.30},
      mods:{industry:1.00,forces:1.00,fleet:1.12}
    },
    {
      name:"Pale Meridian",desc:"A contested system built around a white dwarf and ancient orbital works.",
      req:{authority:220000,alloy:180000,fuel:65000,relics:150,power:65000},legacy:17,
      threat:{name:"Meridian Armada",base:24000,growth:0.75},
      mods:{industry:1.16,forces:0.96,fleet:1.15}
    },
    {
      name:"The Ossuary Belt",desc:"Millions of wrecks form a graveyard rich in relics and ambush positions.",
      req:{authority:700000,data:160000,relics:420,power:220000},legacy:26,
      threat:{name:"Grave-Fleet",base:95000,growth:1.9},
      mods:{industry:0.98,forces:1.04,fleet:1.22}
    },
    {
      name:"Crown of Cinders",desc:"The final known fortress-system surrounding the throne world's lost gate.",
      req:{authority:2500000,alloy:1800000,fuel:650000,relics:1200,power:800000},legacy:40,
      threat:{name:"Crown Defence Grid",base:360000,growth:4.8},
      mods:{industry:1.20,forces:1.10,fleet:1.10}
    }
  ],

  achievements: {
    firstSteel:{name:"First Steel",desc:"Construct 10 Smelter Stacks.",check:"smelter10"},
    standingArmy:{name:"Standing Army",desc:"Field 100 total ground troops.",check:"ground100"},
    voidborn:{name:"Voidborn",desc:"Construct your first warship.",check:"ship1"},
    archaeologist:{name:"Ashes Remember",desc:"Recover 25 Relics.",check:"relic25"},
    suppressor:{name:"Order Restored",desc:"Complete 10 suppression operations.",check:"suppress10"},
    conqueror:{name:"Sector Conqueror",desc:"Conclude 4 different campaigns.",check:"clear4"},
    legacy10:{name:"Inherited Burden",desc:"Accumulate 10 total Legacy.",check:"legacy10"},
    throne:{name:"Cinder Throne",desc:"Conclude the Crown of Cinders campaign.",check:"throne"}
  }
};
