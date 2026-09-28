# SportyBet AI Agent

Autonomous multi-agent sports analysis dashboard focused on SportyBet.

## Verified source facts
SportyBet's public Nigeria site currently exposes many sports, including football, basketball, tennis, eFootball, table tennis, eBasketball, eTennis, ice hockey, handball, volleyball, baseball, American football, cricket, darts, MMA, boxing, badminton, beach volleyball, futsal, rugby, snooker, Basketball 3x3, Counter-Strike, Dota 2 and League of Legends. SportyBet also documents a maximum of 50 selections in a betslip. These facts are used as product constraints; live odds and event data must come from the verified SportyBet interface.

## Architecture
Seven agents: Statistics, Football Specialist, Multi-Sport Specialist, SportyBet Market Intelligence, Odds & Value, Risk/Contrarian, Head Analyst.

The ticket engine supports up to 10 candidate tickets and up to 50 selections per ticket. Each selection preserves the SportyBet event ID, market ID, selection ID and captured odds. Tickets must be revalidated before use so removed markets or changed odds are not silently presented as current.

The learning layer records predictions, settles them against results, and classifies failed selections for later agent-performance analysis.

## Integrity rule
Never invent SportyBet odds, event IDs, market IDs, selection IDs or booking codes. The repository contains a source adapter boundary rather than an undocumented API guess.

## Development
npm install
npm run dev
npm run build


## Current SportyBet integration finding
The official SportyBet Nigeria public pages expose a JavaScript-rendered betting interface and a lighter public page that visibly contains event IDs and odds. SportyBet's help page confirms that the market list appears under each selected match and that selections are added to the betslip from the displayed odds. The adapter therefore targets the public SportyBet source boundary while deliberately avoiding undocumented/private API assumptions.

Source: SportyBet Nigeria official pages and help documentation.
