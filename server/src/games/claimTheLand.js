// claimTheLand.js — Unit 2 game adapter (VERSUS + SOLO).
// Spain vs France, 1519–1722. Six chapters; each chapter a side makes a MAP MOVE
// (place a marker in a region — graded on where + what) and a DECISION
// (3 choices — one right, one partial, one wrong). 12 graded actions per side.
//
// THE ANSWER KEY LIVES HERE, ON THE SERVER. Clients receive prompts and labels
// only, and submit tiny moves; the server grades them and pushes results back.
//
// All student-facing text is written at a 5th grade reading level: short
// sentences, common words, hard terms defined the first time they appear.

import { accuracyPercent } from '../scoring.js';

// ---------------------------------------------------------------------------
// Board metadata (sent to clients at match:begin — display info only)
// ---------------------------------------------------------------------------

export const REGIONS = {
  gulf:       { name: 'Gulf Coast', sub: 'Matagorda Bay', blurb: 'Marshy coast where La Salle landed. Contested ground.' },
  eastTx:     { name: 'East Texas', sub: 'Piney Woods', blurb: 'Caddo country. Tall pines, first missions, the border with French Louisiana.' },
  sanAntonio: { name: 'San Antonio', sub: 'Central Texas', blurb: 'River country in the middle. Spain’s key stop, founded 1718.' },
  rioGrande:  { name: 'Rio Grande', sub: 'The South', blurb: 'Spain’s supply road up from Mexico.' },
  west:       { name: 'The West', sub: 'El Paso country', blurb: 'Far and dry. The edge of any claim.' },
};

export const MARKERS = {
  mission:     { name: 'Mission', icon: 'mission', meter: 'support',
                 blurb: 'A religious settlement built to befriend Native peoples and teach Spanish ways. Raises Support.' },
  presidio:    { name: 'Presidio', icon: 'presidio', meter: 'strength',
                 blurb: 'A military fort that protects missions and settlers. Raises Strength.' },
  tradingPost: { name: 'Trading Post', icon: 'tradingPost', meter: 'territory',
                 blurb: 'A trade fort — France’s specialty. Claims land fast, but holds it weakly. Raises Territory.' },
};

export const METERS = {
  territory: { name: 'Territory', icon: 'territory', blurb: 'How much of Texas you claim.' },
  strength:  { name: 'Strength',  icon: 'strength',  blurb: 'Your military hold — forts and soldiers. At 0, your colony collapses.' },
  support:   { name: 'Support',   icon: 'support',   blurb: 'Missions and Native alliances. Friends make a claim real.' },
};

export const NATIONS = {
  spain:  { name: 'Spain',  color: '#a3262a', color2: '#d4a017', banner: 'banner_spain.jpg',
            motto: 'Hold Texas with missions and presidios.' },
  france: { name: 'France', color: '#26479e', color2: '#e8ecf7', banner: 'banner_france.jpg',
            motto: 'Win Texas with trade and alliances.' },
};

const START_METERS = { territory: 40, strength: 40, support: 40 };

// How strongly each marker holds a region (for the map's claim indicator).
const HOLD_WEIGHT = { presidio: 3, mission: 2, tradingPost: 1 };

// Standard map-move meter effects by verdict. A right placement boosts the
// marker's own meter and your territory; a wrong one costs territory.
function mapEffects(marker, verdict) {
  const meter = MARKERS[marker].meter;
  if (verdict === 'right') {
    return meter === 'territory' ? { territory: 15 } : { [meter]: 10, territory: 5 };
  }
  if (verdict === 'partial') return { [meter]: 5 };
  return { territory: -5 };
}

// ---------------------------------------------------------------------------
// CHAPTERS — the full content bank for both nations.
//
// mapMove.rules are checked in order; the first rule that matches the placed
// (region, marker) decides the verdict + feedback. `regions: null` = any region,
// `markers: null` = any marker. A rule may carry `special: 'fillGap'` (chapter 6
// Spain): right = a mission/presidio in the region where you have the fewest
// markers.
// ---------------------------------------------------------------------------

export const CHAPTERS = {
  // =========================================================================
  // SPAIN — reference path (spec Section 5)
  // =========================================================================
  spain: [
    {
      title: 'Explorers & First Claims', year: '1519', image: 'event_explorers.jpg',
      event: 'Your ships map the Texas coast. A claim means saying the land is yours — but holding it takes people and forts, not just a flag. There is little gold here, so Spain must decide how much to care. Far away, France is exploring the great rivers.',
      mapMove: {
        prompt: 'Make your first move. Pick a region and place a marker.',
        hint: 'Think about where your supplies come from.',
        rules: [
          { regions: ['rioGrande'], markers: null, verdict: 'right',
            feedback: 'Good. Your strength flows from Mexico. Starting near the Rio Grande keeps you supplied.' },
          { regions: ['sanAntonio'], markers: null, verdict: 'partial',
            feedback: 'The middle of Texas matters later. But your supply road starts at the Rio Grande.' },
          { regions: ['west'], markers: null, verdict: 'wrong',
            feedback: 'The west is far and dry. No road from Mexico reaches it yet.' },
          { verdict: 'wrong',
            feedback: 'That is far from your supply road. Spain’s power must climb up from Mexico, step by step.' },
        ],
      },
      decision: {
        prompt: 'How much effort do you put into Texas now?',
        choices: [
          { label: 'Pour everyone into Texas right away.', verdict: 'partial',
            effects: { strength: 5, support: -5 },
            feedback: 'Spain didn’t have people to spare yet. Rushing in early wastes strength you’ll need later.' },
          { label: 'Ignore Texas completely.', verdict: 'wrong',
            effects: { territory: -10 },
            feedback: 'Ignoring the land is how you lose it. Soon a rival will test that.' },
          { label: 'Claim it, but watch for rivals.', verdict: 'right',
            effects: { territory: 10, support: 5 },
            feedback: 'This matches what Spain really did — it claimed Texas but waited, keeping an eye out for other powers.' },
        ],
      },
    },
    {
      title: 'The French Land by Mistake', year: '1685', image: 'event_lasalle.jpg',
      event: 'Alarm! A French leader named La Salle meant to reach the Mississippi River. Instead he landed in Texas by mistake. His people are building a fort — Fort St. Louis — on Matagorda Bay. France is standing on land Spain calls its own.',
      mapMove: {
        prompt: 'The French are somewhere on the coast. Answer the threat on the map.',
        hint: 'Where are the French? What kind of marker watches a coast?',
        rules: [
          { regions: ['gulf'], markers: ['presidio'], verdict: 'right',
            feedback: 'Yes. Spain sent soldiers to hunt for the French fort. A presidio — a military fort — watches the coast.' },
          { regions: ['gulf'], markers: null, verdict: 'partial',
            feedback: 'Watching the coast is right. But this calls for soldiers — a presidio — not a settlement.' },
          { regions: ['eastTx'], markers: ['presidio'], verdict: 'partial',
            feedback: 'Close — but the French are on the bay, not in the pines. Watch the coast.' },
          { verdict: 'wrong',
            feedback: 'The French are on Matagorda Bay. A move far from the coast answers nothing.' },
        ],
      },
      decision: {
        prompt: 'How do you answer the French threat?',
        choices: [
          { label: 'Send missionaries and soldiers to settle East Texas and hold the land.', verdict: 'right',
            effects: { support: 10, strength: 5 },
            feedback: 'Exactly Spain’s real plan — answer France by building missions and presidios.' },
          { label: 'Attack Fort St. Louis with a huge army.', verdict: 'partial',
            effects: { strength: 5, support: -5 },
            feedback: 'Spain looked for the fort, but sickness and conflict destroyed it first. A giant army wasn’t needed and costs you support.' },
          { label: 'Do nothing and hope France leaves.', verdict: 'wrong',
            effects: { territory: -10 },
            feedback: 'Hoping is not a plan. The French visit is exactly why Spain must finally act.' },
        ],
      },
    },
    {
      title: 'Missions Among the Caddo', year: '1690', image: 'event_mission.jpg',
      event: 'Spain sends a priest, Fray Damián Massanet, to East Texas. He founds San Francisco de los Tejas — the first Spanish mission in East Texas. A mission is a religious settlement built to teach and convert Native peoples. This one stands among the Caddo, strong farmers and traders.',
      mapMove: {
        prompt: 'Plant Spain’s answer to France on the map.',
        hint: 'Where do the Caddo live? What did Massanet build?',
        rules: [
          { regions: ['eastTx'], markers: ['mission'], verdict: 'right',
            feedback: 'Right. The first East Texas mission went up in Caddo country — to make friends and to hold the land against France.' },
          { regions: ['eastTx'], markers: ['presidio'], verdict: 'partial',
            feedback: 'A fort holds ground but wins few friends. Spain’s method starts with a mission.' },
          { regions: null, markers: ['mission'], verdict: 'partial',
            feedback: 'A mission is the right tool — but this moment belongs to East Texas, where the Caddo live.' },
          { regions: null, markers: ['tradingPost'], verdict: 'wrong',
            feedback: 'Trading posts are France’s tool. Spain’s method is missions guarded by presidios.' },
          { verdict: 'wrong',
            feedback: 'This moment calls for a mission in East Texas, among the Caddo.' },
        ],
      },
      decision: {
        prompt: 'How do you treat the Caddo?',
        choices: [
          { label: 'Demand the Caddo obey Spain and pay tribute.', verdict: 'wrong',
            effects: { support: -10 },
            feedback: 'Harsh demands pushed Native peoples toward your rivals. This weakens you.' },
          { label: 'Befriend and trade with the Caddo through the mission.', verdict: 'right',
            effects: { support: 15 },
            feedback: 'Missions worked best as bridges to Native peoples. Caddo friendship strengthens your claim.' },
          { label: 'Build only a fort, and no mission.', verdict: 'partial',
            effects: { strength: 5, support: -5 },
            feedback: 'A fort alone holds ground but wins few friends. Spain’s strength came from missions plus presidios.' },
        ],
      },
    },
    {
      title: 'Building the Web', year: '1700s–1718', image: 'event_sanantonio.jpg',
      event: 'Spain links its missions with presidios and roads. Father Antonio Margil de Jesús helps found new missions. In 1718 Spain starts San Antonio — a mission and a fort beside a clear river, halfway between the Rio Grande and East Texas.',
      mapMove: {
        prompt: 'Build the heart of Spanish Texas.',
        hint: 'What place ties the Rio Grande to East Texas?',
        rules: [
          { regions: ['sanAntonio'], markers: ['mission', 'presidio'], verdict: 'right',
            feedback: 'San Antonio became the heart of Spanish Texas — a mission and a presidio rising together, halfway along the road.' },
          { regions: ['sanAntonio'], markers: null, verdict: 'partial',
            feedback: 'The place is right. But San Antonio grew from a mission and a presidio, not a trading post.' },
          { regions: ['rioGrande'], markers: ['mission', 'presidio'], verdict: 'partial',
            feedback: 'Your road is already safe in the south. The gap to fill is in the middle of Texas.' },
          { verdict: 'wrong',
            feedback: 'The chain has a gap in the middle. Spain filled it at San Antonio in 1718.' },
        ],
      },
      decision: {
        prompt: 'How do you connect your settlements?',
        choices: [
          { label: 'Spread thin, with tiny outposts everywhere.', verdict: 'partial',
            effects: { territory: 5, strength: -5 },
            feedback: 'Too many weak outposts are hard to defend and supply.' },
          { label: 'Pull back to the Rio Grande and give up the center.', verdict: 'wrong',
            effects: { territory: -10 },
            feedback: 'Retreating hands the middle of Texas to your rivals.' },
          { label: 'Build San Antonio as a supply stop linking your missions.', verdict: 'right',
            effects: { territory: 10, strength: 5 },
            feedback: 'This is why San Antonio mattered — it tied the whole claim together.' },
        ],
      },
    },
    {
      title: 'The Chicken War', year: '1719', image: 'event_chickenwar.jpg',
      eventEffects: { strength: -5 },
      event: 'Spain and France are at war in Europe — and the news just reached Texas. A small French force from Louisiana surprises a Spanish mission in East Texas and takes it. Chickens scatter; the friars flee. It is a tiny fight with a loud message. (Strength −5)',
      mapMove: {
        prompt: 'The border was tested. Answer on the map.',
        hint: 'Which region was raided? What protects missions?',
        rules: [
          { regions: ['eastTx'], markers: ['presidio'], verdict: 'right',
            feedback: 'Yes. After the scare, Spain reinforced East Texas — strong forts like Los Adaes rose to guard the border with French Louisiana.' },
          { regions: ['eastTx'], markers: ['mission'], verdict: 'partial',
            feedback: 'The missions are already there. What they need now are soldiers — a presidio.' },
          { regions: ['gulf', 'sanAntonio'], markers: ['presidio'], verdict: 'partial',
            feedback: 'Strength helps — but the border France just raided is East Texas.' },
          { verdict: 'wrong',
            feedback: 'France raided East Texas. Guard the border that was tested.' },
        ],
      },
      decision: {
        prompt: 'How do you respond to the raid?',
        choices: [
          { label: 'Abandon East Texas as too risky.', verdict: 'wrong',
            effects: { territory: -15 },
            feedback: 'Leaving hands the borderland to France. Spain chose to stay.' },
          { label: 'Reinforce the East Texas missions with presidios and settlers.', verdict: 'right',
            effects: { strength: 10, territory: 5 },
            feedback: 'Spain answered the Chicken War by digging in and holding the border.' },
          { label: 'Launch a full war on French Louisiana.', verdict: 'partial',
            effects: { strength: -5 },
            feedback: 'A big war was beyond Spain’s strength here. Holding firm was smarter than overreaching.' },
        ],
      },
    },
    {
      title: 'Securing Texas', year: '1720s', image: 'event_securing.jpg',
      event: 'France is short on settlers and supplies, and it pulls back toward Louisiana. Spain’s web of missions and presidios holds. One last push can lock in the claim — or lose it.',
      mapMove: {
        prompt: 'Fill the weakest gap in your claim.',
        hint: 'Look at the map. Where do you have the fewest markers?',
        special: 'fillGap',
        rules: [
          { special: 'fillGap', markers: ['mission', 'presidio'], verdict: 'right',
            feedback: 'Filling your weakest spot locks in the claim. Spain won Texas by building, piece by piece.' },
          { regions: null, markers: ['mission', 'presidio'], verdict: 'partial',
            feedback: 'Building is good — but your weakest region is still open. Strong claims have no gaps.' },
          { verdict: 'wrong',
            feedback: 'A trading post is France’s tool, and it holds land weakly. Finish with a mission or a presidio.' },
        ],
      },
      decision: {
        prompt: 'How do you finish the era?',
        choices: [
          { label: 'Strengthen and connect what you have.', verdict: 'right',
            effects: { territory: 10, support: 5 },
            feedback: 'Spain won Texas not by conquest but by settling and building. This seals it.' },
          { label: 'Grab new far-off land you can’t defend.', verdict: 'partial',
            effects: { territory: 5, strength: -10 },
            feedback: 'Overreaching late in the game risks losing what you built.' },
          { label: 'Stop building and coast.', verdict: 'wrong',
            effects: { territory: -5 },
            feedback: 'The race isn’t over until it’s over. Coasting lets rivals creep back.' },
        ],
      },
    },
  ],

  // =========================================================================
  // FRANCE — parallel path (same beats, France's real strategy)
  // =========================================================================
  france: [
    {
      title: 'Explorers & First Claims', year: '1519', image: 'event_explorers.jpg',
      event: 'Spain’s ships are mapping the Texas coast and making a claim — saying the land is theirs. France is far to the north, trading furs and exploring great rivers. Your king wants trade routes and river paths, not empty deserts.',
      mapMove: {
        prompt: 'Where does France look first? Pick a region and place a marker.',
        hint: 'France’s power is rivers and trade, not armies of settlers.',
        rules: [
          { regions: ['gulf'], markers: ['tradingPost'], verdict: 'right',
            feedback: 'Yes. The coast points toward the great river — the Mississippi. Trade moves by water, and France moves by trade.' },
          { regions: ['eastTx'], markers: ['tradingPost'], verdict: 'partial',
            feedback: 'Rivers, forests, and trading partners — not bad. But the coast is the door to the Mississippi.' },
          { regions: ['gulf'], markers: ['presidio'], verdict: 'partial',
            feedback: 'A fort can hold a spot. But France wins by trading, not just holding.' },
          { regions: null, markers: ['mission'], verdict: 'wrong',
            feedback: 'France has few priests and fewer settlers to staff missions. That is Spain’s method, not yours.' },
          { regions: ['rioGrande'], markers: null, verdict: 'wrong',
            feedback: 'That is Spain’s road up from Mexico. France’s path runs along the rivers and the coast.' },
          { verdict: 'wrong',
            feedback: 'Too far from the rivers and the coast. France’s strength moves by water and by trade.' },
        ],
      },
      decision: {
        prompt: 'What is France’s plan for this land?',
        choices: [
          { label: 'Plant one small claim and wait.', verdict: 'partial',
            effects: { territory: 5 },
            feedback: 'Careful — but too careful. France thrived by moving, mapping, and trading.' },
          { label: 'Try to out-settle Spain with waves of colonists.', verdict: 'wrong',
            effects: { strength: -10 },
            feedback: 'France never sent enough colonists — people who move in and hold the land. That weakness never goes away. Don’t play Spain’s game.' },
          { label: 'Explore the rivers and coast for a route to the Mississippi, and note who wants to trade.', verdict: 'right',
            effects: { support: 10, territory: 5 },
            feedback: 'France’s real strategy: river routes and trade friendships. That is your power.' },
        ],
      },
    },
    {
      title: 'La Salle Lands by Mistake', year: '1685', image: 'event_lasalle.jpg',
      eventEffects: { strength: -10 },
      event: 'Your leader, La Salle, sails for the mouth of the Mississippi River. But the maps are bad, and he lands in Texas by mistake. Your people start building Fort St. Louis on Matagorda Bay. The ships are damaged. Food is already running short. (Strength −10)',
      mapMove: {
        prompt: 'Your colonists are on the bay. Make your move on the map.',
        hint: 'Your people are already ashore. Build where they stand.',
        rules: [
          { regions: ['gulf'], markers: ['tradingPost'], verdict: 'right',
            feedback: 'Fort St. Louis rises on the bay — a rough wooden fort and trading base. Now find the Mississippi and food.' },
          { regions: ['gulf'], markers: ['presidio'], verdict: 'partial',
            feedback: 'You dig in hard. But walls don’t fill bellies. France needed food and trade more than cannons.' },
          { regions: ['gulf'], markers: ['mission'], verdict: 'wrong',
            feedback: 'France has no priests to spare here. Your hungry colonists need a fort and trade.' },
          { verdict: 'wrong',
            feedback: 'Your people landed on Matagorda Bay. Leaving them now would be the end of them.' },
        ],
      },
      decision: {
        prompt: 'The colony is in trouble. What is your plan?',
        choices: [
          { label: 'Finish the fort, search for the Mississippi, and trade with Native peoples for food.', verdict: 'right',
            effects: { territory: 10, strength: 5 },
            feedback: 'This was La Salle’s real aim — hold on, find the river, and trade to survive.' },
          { label: 'Pile up walls and cannons, and ignore the food problem.', verdict: 'partial',
            effects: { strength: 5, support: -5 },
            feedback: 'Strong walls, empty stomachs. The real Fort St. Louis had cannons — and starved anyway.' },
          { label: 'Sit still and wait for supply ships from France.', verdict: 'wrong',
            effects: { strength: -15 },
            feedback: 'The real colony waited. The ships never came. Hunger and sickness moved faster than help.' },
        ],
      },
    },
    {
      title: 'After the Fort Falls', year: '1690', image: 'event_mission.jpg',
      eventEffects: { strength: -10 },
      event: 'Hard news. Sickness, hunger, and conflict destroy Fort St. Louis. (Strength −10) But French traders still walk the woods. In East Texas live the Caddo — strong farmers and traders. Spain is sending priests to win them. France has something Spain doesn’t: goods the Caddo want.',
      mapMove: {
        prompt: 'Rebuild France’s claim — your way.',
        hint: 'Where do the Caddo live? What does France do best?',
        rules: [
          { regions: ['eastTx'], markers: ['tradingPost'], verdict: 'right',
            feedback: 'Trade goods, not walls. Fair trade wins Caddo respect — this is France at its best.' },
          { regions: ['eastTx'], markers: ['presidio'], verdict: 'partial',
            feedback: 'A fort among the pines holds a point on the map. But the Caddo answer to trade, not to walls.' },
          { regions: null, markers: ['mission'], verdict: 'wrong',
            feedback: 'Missions are Spain’s method. France cannot staff them — play to your strength: trade.' },
          { verdict: 'wrong',
            feedback: 'The chance is in East Texas, where the Caddo trade. Go where the partners are.' },
        ],
      },
      decision: {
        prompt: 'How do you treat the Caddo?',
        choices: [
          { label: 'Trade a little, fortify a little.', verdict: 'partial',
            effects: { support: 5, strength: 5 },
            feedback: 'Half-measures. France’s edge was friendship and trade, full-hearted.' },
          { label: 'Win Caddo friendship with gifts and fair trade.', verdict: 'right',
            effects: { support: 15 },
            feedback: 'Alliances — friendly agreements between nations — were France’s great strength. The Caddo valued French goods and fair dealing.' },
          { label: 'Demand the Caddo obey France, like an empire.', verdict: 'wrong',
            effects: { support: -10 },
            feedback: 'France’s edge was friendship, not force. Demands push the Caddo toward Spain.' },
        ],
      },
    },
    {
      title: 'The Louisiana Trade', year: '1700s–1718', image: 'event_sanantonio.jpg',
      eventEffects: { strength: -5 },
      event: 'France builds Louisiana, just east of Texas. A new post at Natchitoches sits right on the Texas border, and trade goods flow west. But few colonists come from France. You never have enough people. (Strength −5)',
      mapMove: {
        prompt: 'Feed the Texas trade from Louisiana.',
        hint: 'Which Texas region touches French Louisiana?',
        rules: [
          { regions: ['eastTx'], markers: ['tradingPost'], verdict: 'right',
            feedback: 'Yes — border posts like Natchitoches fed French goods into Texas and kept the Caddo trade alive.' },
          { regions: ['gulf'], markers: ['tradingPost'], verdict: 'partial',
            feedback: 'Coast trade helps. But the action now is on the Louisiana border, in East Texas.' },
          { regions: null, markers: ['mission'], verdict: 'wrong',
            feedback: 'Spanish-style missions need priests and settlers France doesn’t have. Stick to trade.' },
          { verdict: 'wrong',
            feedback: 'France’s lifeline is the Louisiana border. Build where your goods can reach.' },
        ],
      },
      decision: {
        prompt: 'How does France grow its claim?',
        choices: [
          { label: 'Scatter tiny posts all over the map.', verdict: 'partial',
            effects: { territory: 5, strength: -5 },
            feedback: 'Too thin. Weak posts with no people behind them are easy to lose.' },
          { label: 'Grow the border trade posts and let goods flow into Texas.', verdict: 'right',
            effects: { territory: 10, support: 5 },
            feedback: 'Exactly France’s method — a few strong posts and busy trade routes instead of many settlements.' },
          { label: 'Copy Spain and build missions France can’t staff.', verdict: 'wrong',
            effects: { strength: -10 },
            feedback: 'France tried nothing like Spain’s mission web — it simply couldn’t. Not enough people.' },
        ],
      },
    },
    {
      title: 'The Chicken War', year: '1719', image: 'event_chickenwar.jpg',
      event: 'Spain and France are at war in Europe — and the news just reached Louisiana. Spain’s missions in East Texas sit lightly guarded. A quick, small strike could shake them — if you follow it up wisely.',
      mapMove: {
        prompt: 'Press France’s edge on the border.',
        hint: 'This is a military moment — but a small one.',
        rules: [
          { regions: ['eastTx'], markers: ['presidio'], verdict: 'right',
            feedback: 'Your little force raids the Spanish mission. Chickens scatter; the friars flee. A tiny fight — the “Chicken War” — but Spain is shaken.' },
          { regions: ['eastTx'], markers: ['tradingPost'], verdict: 'partial',
            feedback: 'Trade keeps friends close — but this moment was a raid. France pressed with soldiers, then traded after.' },
          { regions: ['gulf'], markers: null, verdict: 'wrong',
            feedback: 'The border with Louisiana is in East Texas. The coast is not where this fight is.' },
          { verdict: 'wrong',
            feedback: 'This chapter is on the East Texas border, where French Louisiana touches Spanish missions.' },
        ],
      },
      decision: {
        prompt: 'The raid worked. What now?',
        choices: [
          { label: 'Raid, then do nothing.', verdict: 'partial',
            effects: { territory: 5 },
            feedback: 'You startled Spain — and gave them time to come back stronger. And they did.' },
          { label: 'Launch a full war France cannot supply.', verdict: 'wrong',
            effects: { strength: -15 },
            feedback: 'France could not feed a real war so far from home. Overreach breaks weak colonies.' },
          { label: 'Follow the raid with gifts and trade, to keep local support.', verdict: 'right',
            effects: { support: 10, territory: 5 },
            feedback: 'France’s way: a small show of force, then trade and friendship to hold the gain.' },
        ],
      },
    },
    {
      title: 'The Race Ends', year: '1720s', image: 'event_securing.jpg',
      eventEffects: { territory: -20 },
      event: 'The war in Europe ends. France counts its people in Texas — far too few. Spain is reinforcing every mission and fort. Your king orders focus on Louisiana, where trade is rich. France’s race for Texas is slipping away. (Territory −20)',
      mapMove: {
        prompt: 'Make France’s last move in the Texas game.',
        hint: 'What can France still keep alive here?',
        rules: [
          { regions: ['eastTx'], markers: ['tradingPost'], verdict: 'right',
            feedback: 'Wise. The forts go, but the trade stays. French goods kept flowing over the border for years.' },
          { regions: ['eastTx'], markers: ['presidio'], verdict: 'partial',
            feedback: 'A lone fort with no settlers behind it cannot hold. That is France’s whole problem, in one picture.' },
          { regions: null, markers: ['mission'], verdict: 'wrong',
            feedback: 'Missions were never France’s tool — and it is far too late to start.' },
          { verdict: 'wrong',
            feedback: 'Pushing deeper into Texas with no settlers is how colonies die. Keep the trade door open instead.' },
        ],
      },
      decision: {
        prompt: 'How does France finish the era?',
        choices: [
          { label: 'Hold Louisiana strong, and keep the Texas trade ties alive.', verdict: 'right',
            effects: { support: 10 },
            feedback: 'This is what France really did — it lost the Texas race but built a rich Louisiana next door.' },
          { label: 'Keep one lone fort in Texas and hope.', verdict: 'partial',
            effects: { territory: 5, strength: -5 },
            feedback: 'Hope is not supplies. A lone fort just waits to be lost.' },
          { label: 'Overextend into Texas with settlers you don’t have.', verdict: 'wrong',
            effects: { strength: -15 },
            feedback: 'The colonists never came. Stretching a thin colony thinner is how it snaps.' },
        ],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Endings & debriefs
// ---------------------------------------------------------------------------

const ENDINGS = {
  spain: {
    secured: {
      title: 'Secured the Land',
      text: 'Your web of missions and presidios holds Texas. San Antonio thrives at its center. Spain claimed this land not with one battle, but with years of building, settling, and alliance-making.',
    },
    held: {
      title: 'Held On',
      text: 'Spain keeps a grip on Texas — but a shaky one. Gaps in the web of missions and presidios left room for rivals. The claim survives; it does not yet thrive.',
    },
    lost: {
      title: 'Lost the Race',
      text: 'The claim slipped away. Without steady building — missions, presidios, settlers, and friendship with Native peoples — a flag on a map means nothing.',
    },
    collapsed: {
      title: 'The Colony Collapsed',
      text: 'Your strength fell to nothing, and the colony broke apart. Even mighty Spain needed soldiers, supplies, and friends to hold a land this big.',
    },
  },
  france: {
    secured: {
      title: 'Against the Odds',
      text: 'You did what history could not: France’s trade web actually holds its Texas claim. Every alliance, every post, every choice ran with France’s true strategy — and this time, it was enough.',
    },
    held: {
      title: 'Held On',
      text: 'France keeps a foothold — trade ties, a border post, Caddo friends. In real history this is close to France’s best: strong in Louisiana, with fingers reaching into Texas.',
    },
    lost: {
      title: 'Lost the Race',
      text: 'France’s race for Texas ends, as it did in real history. Too few colonists, too few supplies — no colony can live on trade alone. Louisiana, though, thrives.',
    },
    collapsed: {
      title: 'The Colony Collapsed',
      text: 'Like the real Fort St. Louis, your colony ran out of food, people, and luck. France’s great weakness — too few settlers, too few supplies — caught up with you.',
    },
  },
};

const DEBRIEFS = {
  spain: 'What really happened: Spain ignored Texas for years — until La Salle’s French fort set off alarms. Spain answered with missions (to befriend and convert Native peoples) and presidios (forts to protect them), founded San Antonio in 1718, and dug in after the 1719 “Chicken War.” By the 1720s, Spain’s web of settlements had won the race for Texas.',
  france: 'What really happened: France reached Texas by accident — La Salle missed the Mississippi and built Fort St. Louis in 1685. The fort starved and fell. France’s real power was trade and alliances, and it never sent enough colonists or supplies to hold Texas. France lost the Texas race but built a strong Louisiana — and its challenge is the reason Spain finally settled Texas.',
};

// Shown to a France player who lost the match but played accurately (>= 70%).
const FRANCE_ACCURATE_LOSS_NOTE =
  'Important: you played France’s real strategy well. France losing the Texas race IS the true history — too few settlers and supplies. A high accuracy score here means you understood exactly why. That’s the win that counts.';

// ---------------------------------------------------------------------------
// Adapter — the object GameManager drives.
// ---------------------------------------------------------------------------

const CHAPTER_COUNT = 6;
const TOTAL_ACTIONS = 12; // 6 map moves + 6 decisions
const SIDES = ['spain', 'france'];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function makeSideState(side, isAI = false) {
  const chapters = CHAPTERS[side];
  return {
    key: side,
    isAI,
    cursor: 0,                 // 0..11: even = map move, odd = decision
    meters: { ...START_METERS },
    actions: [],               // [{ stepIndex, kind, verdict, points }]
    collapsed: false,
    eventApplied: -1,          // last chapter whose eventEffects were applied
    // Per-match shuffle of decision choices, so "the first answer" is never a tell.
    shuffles: chapters.map((ch) => shuffle([...ch.decision.choices.keys()])),
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function applyEffects(sideState, effects = {}) {
  for (const [k, v] of Object.entries(effects)) {
    sideState.meters[k] = clamp((sideState.meters[k] ?? 0) + v, 0, 100);
  }
  if (sideState.meters.strength <= 0) sideState.collapsed = true;
}

// Region ownership for the claim indicator: weight markers, compare sides.
export function regionOwners(map) {
  const owners = {};
  for (const [regionId, region] of Object.entries(map.regions)) {
    const weight = { spain: 0, france: 0 };
    for (const m of region.markers) weight[m.side] += HOLD_WEIGHT[m.marker] || 1;
    owners[regionId] =
      weight.spain === weight.france
        ? (weight.spain > 0 ? 'contested' : null)
        : (weight.spain > weight.france ? 'spain' : 'france');
  }
  return owners;
}

// The region(s) where `side` currently has the fewest markers (chapter 6 Spain).
function weakestRegions(map, side) {
  const counts = Object.entries(map.regions).map(([id, r]) => [id, r.markers.filter((m) => m.side === side).length]);
  const min = Math.min(...counts.map(([, n]) => n));
  return counts.filter(([, n]) => n === min).map(([id]) => id);
}

function gradeMapMove(state, side, region, marker) {
  const chapter = CHAPTERS[side][chapterOf(state.sides[side].cursor)];
  for (const rule of chapter.mapMove.rules) {
    const regionOk = rule.special === 'fillGap'
      ? weakestRegions(state.map, side).includes(region)
      : (!rule.regions || rule.regions.includes(region));
    const markerOk = !rule.markers || rule.markers.includes(marker);
    if (regionOk && markerOk) return rule;
  }
  return { verdict: 'wrong', feedback: 'That move doesn’t fit this moment in history.' };
}

const chapterOf = (cursor) => Math.floor(cursor / 2);
const stepKind = (cursor) => (cursor % 2 === 0 ? 'map' : 'decision');

function chapterMeta(side, idx) {
  const ch = CHAPTERS[side][idx];
  return { index: idx, count: CHAPTER_COUNT, title: ch.title, year: ch.year, image: ch.image };
}

const claimTheLand = {
  id: 'claim-the-land',
  title: 'Claim the Land',
  modes: ['solo', 'versus'],
  sides: SIDES,
  totalActions: TOTAL_ACTIONS,
  meta: { regions: REGIONS, markers: MARKERS, meters: METERS, nations: NATIONS },

  // mode: 'versus' → both sides human; 'solo' → soloSide is human, other is AI.
  initMatch({ mode, soloSide }) {
    const sides = {};
    if (mode === 'versus') {
      for (const s of SIDES) sides[s] = makeSideState(s);
    } else {
      const chosen = SIDES.includes(soloSide) ? soloSide : 'spain';
      const ai = SIDES.find((s) => s !== chosen);
      sides[chosen] = makeSideState(chosen);
      sides[ai] = makeSideState(ai, true);
    }
    return {
      mode,
      map: { regions: Object.fromEntries(Object.keys(REGIONS).map((id) => [id, { markers: [] }])) },
      sides,
      whoseTurn: 'spain', // Spain claimed first; Spain moves first each chapter
      chapterIndex: 0,
      status: 'active',
      winner: null,
    };
  },

  // The chapter event card for `side`, applying its one-time meter toll.
  // Returns null if this chapter's event was already delivered to this side.
  chapterEvent(state, side) {
    const ss = state.sides[side];
    const idx = chapterOf(ss.cursor);
    if (idx >= CHAPTER_COUNT || ss.eventApplied >= idx) return null;
    const ch = CHAPTERS[side][idx];
    ss.eventApplied = idx;
    if (ch.eventEffects) applyEffects(ss, ch.eventEffects);
    return {
      chapter: chapterMeta(side, idx),
      text: ch.event,
      eventEffects: ch.eventEffects || null,
      meters: { ...ss.meters },
    };
  },

  // Non-mutating version of chapterEvent, for re-pushing state after a reconnect.
  eventSnapshot(state, side) {
    const ss = state.sides[side];
    const idx = Math.min(chapterOf(ss.cursor), CHAPTER_COUNT - 1);
    const ch = CHAPTERS[side][idx];
    return {
      chapter: chapterMeta(side, idx),
      text: ch.event,
      eventEffects: ch.eventEffects || null,
      meters: { ...ss.meters },
    };
  },

  // What `side` should see right now. NO verdicts, effects, or feedback leak out.
  currentPrompt(state, side) {
    const ss = state.sides[side];
    if (ss.cursor >= TOTAL_ACTIONS) return null;
    const idx = chapterOf(ss.cursor);
    const ch = CHAPTERS[side][idx];
    const base = {
      stepIndex: ss.cursor,
      kind: stepKind(ss.cursor),
      chapter: chapterMeta(side, idx),
      meters: { ...ss.meters },
    };
    if (base.kind === 'map') {
      return { ...base, prompt: ch.mapMove.prompt, hint: ch.mapMove.hint };
    }
    const order = ss.shuffles[idx];
    return { ...base, prompt: ch.decision.prompt, choices: order.map((i) => ch.decision.choices[i].label) };
  },

  // Apply a submitted move. move = { kind:'map', region, marker } | { kind:'decision', choiceIndex }.
  resolve(state, side, move) {
    const ss = state.sides[side];
    if (ss.cursor >= TOTAL_ACTIONS) return { error: 'side_done' };
    const kind = stepKind(ss.cursor);
    if (!move || move.kind !== kind) return { error: 'wrong_step_kind' };
    const idx = chapterOf(ss.cursor);
    const ch = CHAPTERS[side][idx];

    let verdict, feedback, effects, placed = null;

    if (kind === 'map') {
      const { region, marker } = move;
      if (!REGIONS[region] || !MARKERS[marker]) return { error: 'bad_move' };
      const rule = gradeMapMove(state, side, region, marker);
      verdict = rule.verdict;
      feedback = rule.feedback;
      effects = rule.effects || mapEffects(marker, verdict);
      state.map.regions[region].markers.push({ side, marker });
      placed = { region, marker };
    } else {
      const order = ss.shuffles[idx];
      const realIndex = order[move.choiceIndex];
      const choice = ch.decision.choices[realIndex];
      if (!choice) return { error: 'bad_choice' };
      verdict = choice.verdict;
      feedback = choice.feedback;
      effects = choice.effects || {};
    }

    applyEffects(ss, effects);
    const points = verdict === 'right' ? 1 : verdict === 'partial' ? 0.5 : 0;
    ss.actions.push({ stepIndex: ss.cursor, kind, verdict, points });
    ss.cursor += 1;

    return {
      side, kind, verdict, feedback, effects, placed,
      stepIndex: ss.cursor - 1,
      meters: { ...ss.meters },
      collapsed: ss.collapsed,
      chapterDone: ss.cursor % 2 === 0,
      sideDone: ss.cursor >= TOTAL_ACTIONS,
    };
  },

  // The historically right move for `side` right now (AI opponent / dropout fill-in).
  aiMove(state, side) {
    const ss = state.sides[side];
    const idx = chapterOf(ss.cursor);
    const ch = CHAPTERS[side][idx];
    if (stepKind(ss.cursor) === 'map') {
      const rule = ch.mapMove.rules.find((r) => r.verdict === 'right');
      const marker = (rule.markers || ['presidio'])[0];
      const region = rule.special === 'fillGap'
        ? weakestRegions(state.map, side)[0]
        : (rule.regions || Object.keys(REGIONS))[0];
      return { kind: 'map', region, marker };
    }
    const rightIdx = ch.decision.choices.findIndex((c) => c.verdict === 'right');
    // Present the AI's choice through the same shuffle mapping resolve() expects.
    const shuffledIdx = ss.shuffles[idx].indexOf(rightIdx);
    return { kind: 'decision', choiceIndex: shuffledIdx };
  },

  isComplete(state) {
    return Object.values(state.sides).every((ss) => ss.cursor >= TOTAL_ACTIONS);
  },

  owners(state) {
    return regionOwners(state.map);
  },

  claimScore(ss) {
    const m = ss.meters;
    return m.territory + m.strength / 2 + m.support / 2;
  },

  // Final report: winner, endings, debriefs, accuracy — everything match:end needs.
  report(state) {
    const owners = regionOwners(state.map);
    const perSide = {};
    for (const side of SIDES) {
      const ss = state.sides[side];
      const score = this.claimScore(ss);
      const regionsHeld = Object.values(owners).filter((o) => o === side).length;
      let endingKey;
      if (ss.collapsed) endingKey = 'collapsed';
      else if (score >= 170) endingKey = 'secured';
      else if (score >= 120) endingKey = 'held';
      else endingKey = 'lost';
      perSide[side] = {
        isAI: !!ss.isAI,
        claimScore: Math.round(score),
        meters: { ...ss.meters },
        regionsHeld,
        collapsed: ss.collapsed,
        accuracy: accuracyPercent(ss.actions, TOTAL_ACTIONS),
        ending: { key: endingKey, ...ENDINGS[side][endingKey] },
        debrief: DEBRIEFS[side],
      };
    }

    // Winner: a collapsed colony loses outright; otherwise higher Claim Score.
    const [a, b] = SIDES;
    let winner;
    if (perSide[a].collapsed && !perSide[b].collapsed) winner = b;
    else if (perSide[b].collapsed && !perSide[a].collapsed) winner = a;
    else if (perSide[a].claimScore === perSide[b].claimScore) winner = 'tie';
    else winner = perSide[a].claimScore > perSide[b].claimScore ? a : b;

    // The France lesson (spec §19): accurate France players who lose still "win."
    if (winner !== 'france' && perSide.france.accuracy >= 70 && !state.sides.france.isAI) {
      perSide.france.accuracyNote = FRANCE_ACCURATE_LOSS_NOTE;
    }

    return { winner, owners, perSide };
  },
};

export default claimTheLand;
