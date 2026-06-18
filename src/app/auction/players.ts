// 2000–2010 football legends pool for the friendly auction game.
// Position = primary auction position: GK | DEF | MID | ATT.
// `note` flags players who only arrived late in the decade or left early.

export type Position = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface Player {
  id: string;
  name: string;
  club: string;
  position: Position;
  note?: string;
}

export const CLUBS = [
  'Inter Milan',
  'AC Milan',
  'Juventus',
  'Chelsea',
  'Manchester United',
  'Manchester City',
  'Liverpool',
  'Barcelona',
  'Real Madrid',
  'Atletico Madrid',
  'PSG',
  'Bayern Munich',
] as const;

// Raw list grouped by club; ids are generated below so we never hand-maintain them.
const RAW: Omit<Player, 'id'>[] = [
  // Inter Milan
  { name: 'Júlio César', club: 'Inter Milan', position: 'GK' },
  { name: 'Francesco Toldo', club: 'Inter Milan', position: 'GK' },
  { name: 'Javier Zanetti', club: 'Inter Milan', position: 'DEF' },
  { name: 'Maicon', club: 'Inter Milan', position: 'DEF' },
  { name: 'Marco Materazzi', club: 'Inter Milan', position: 'DEF' },
  { name: 'Walter Samuel', club: 'Inter Milan', position: 'DEF' },
  { name: 'Lúcio', club: 'Inter Milan', position: 'DEF' },
  { name: 'Iván Córdoba', club: 'Inter Milan', position: 'DEF' },
  { name: 'Esteban Cambiasso', club: 'Inter Milan', position: 'MID' },
  { name: 'Wesley Sneijder', club: 'Inter Milan', position: 'MID' },
  { name: 'Dejan Stanković', club: 'Inter Milan', position: 'MID' },
  { name: 'Patrick Vieira', club: 'Inter Milan', position: 'MID' },
  { name: 'Clarence Seedorf', club: 'Inter Milan', position: 'MID', note: 'early' },
  { name: 'Ronaldo (R9)', club: 'Inter Milan', position: 'ATT' },
  { name: 'Adriano', club: 'Inter Milan', position: 'ATT' },
  { name: 'Zlatan Ibrahimović', club: 'Inter Milan', position: 'ATT' },
  { name: "Samuel Eto'o", club: 'Inter Milan', position: 'ATT' },
  { name: 'Diego Milito', club: 'Inter Milan', position: 'ATT' },
  { name: 'Hernán Crespo', club: 'Inter Milan', position: 'ATT' },
  { name: 'Christian Vieri', club: 'Inter Milan', position: 'ATT' },

  // AC Milan
  { name: 'Dida', club: 'AC Milan', position: 'GK' },
  { name: 'Paolo Maldini', club: 'AC Milan', position: 'DEF' },
  { name: 'Alessandro Nesta', club: 'AC Milan', position: 'DEF' },
  { name: 'Cafu', club: 'AC Milan', position: 'DEF' },
  { name: 'Jaap Stam', club: 'AC Milan', position: 'DEF' },
  { name: 'Thiago Silva', club: 'AC Milan', position: 'DEF', note: 'late' },
  { name: 'Andrea Pirlo', club: 'AC Milan', position: 'MID' },
  { name: 'Clarence Seedorf', club: 'AC Milan', position: 'MID' },
  { name: 'Gennaro Gattuso', club: 'AC Milan', position: 'MID' },
  { name: 'Kaká', club: 'AC Milan', position: 'MID' },
  { name: 'Rui Costa', club: 'AC Milan', position: 'MID' },
  { name: 'Andriy Shevchenko', club: 'AC Milan', position: 'ATT' },
  { name: 'Filippo Inzaghi', club: 'AC Milan', position: 'ATT' },
  { name: 'Ronaldinho', club: 'AC Milan', position: 'ATT', note: 'late' },
  { name: 'Alexandre Pato', club: 'AC Milan', position: 'ATT' },

  // Juventus
  { name: 'Gianluigi Buffon', club: 'Juventus', position: 'GK' },
  { name: 'Fabio Cannavaro', club: 'Juventus', position: 'DEF' },
  { name: 'Lilian Thuram', club: 'Juventus', position: 'DEF' },
  { name: 'Gianluca Zambrotta', club: 'Juventus', position: 'DEF' },
  { name: 'Giorgio Chiellini', club: 'Juventus', position: 'DEF' },
  { name: 'Pavel Nedvěd', club: 'Juventus', position: 'MID' },
  { name: 'Edgar Davids', club: 'Juventus', position: 'MID' },
  { name: 'Mauro Camoranesi', club: 'Juventus', position: 'MID' },
  { name: 'Emerson', club: 'Juventus', position: 'MID' },
  { name: 'Alessandro Del Piero', club: 'Juventus', position: 'ATT' },
  { name: 'David Trezeguet', club: 'Juventus', position: 'ATT' },
  { name: 'Zlatan Ibrahimović', club: 'Juventus', position: 'ATT' },

  // Chelsea
  { name: 'Petr Čech', club: 'Chelsea', position: 'GK' },
  { name: 'John Terry', club: 'Chelsea', position: 'DEF' },
  { name: 'Ashley Cole', club: 'Chelsea', position: 'DEF' },
  { name: 'Ricardo Carvalho', club: 'Chelsea', position: 'DEF' },
  { name: 'Paulo Ferreira', club: 'Chelsea', position: 'DEF' },
  { name: 'William Gallas', club: 'Chelsea', position: 'DEF' },
  { name: 'Frank Lampard', club: 'Chelsea', position: 'MID' },
  { name: 'Claude Makélélé', club: 'Chelsea', position: 'MID' },
  { name: 'Michael Essien', club: 'Chelsea', position: 'MID' },
  { name: 'Michael Ballack', club: 'Chelsea', position: 'MID' },
  { name: 'Joe Cole', club: 'Chelsea', position: 'MID' },
  { name: 'Didier Drogba', club: 'Chelsea', position: 'ATT' },
  { name: 'Andriy Shevchenko', club: 'Chelsea', position: 'ATT' },
  { name: 'Nicolas Anelka', club: 'Chelsea', position: 'ATT' },
  { name: 'Arjen Robben', club: 'Chelsea', position: 'ATT' },
  { name: 'Damien Duff', club: 'Chelsea', position: 'ATT' },

  // Manchester United
  { name: 'Edwin van der Sar', club: 'Manchester United', position: 'GK' },
  { name: 'Fabien Barthez', club: 'Manchester United', position: 'GK' },
  { name: 'Rio Ferdinand', club: 'Manchester United', position: 'DEF' },
  { name: 'Nemanja Vidić', club: 'Manchester United', position: 'DEF' },
  { name: 'Gary Neville', club: 'Manchester United', position: 'DEF' },
  { name: 'Patrice Evra', club: 'Manchester United', position: 'DEF' },
  { name: 'Wes Brown', club: 'Manchester United', position: 'DEF' },
  { name: 'Paul Scholes', club: 'Manchester United', position: 'MID' },
  { name: 'Ryan Giggs', club: 'Manchester United', position: 'MID' },
  { name: 'Roy Keane', club: 'Manchester United', position: 'MID' },
  { name: 'Cristiano Ronaldo', club: 'Manchester United', position: 'MID' },
  { name: 'Park Ji-sung', club: 'Manchester United', position: 'MID' },
  { name: 'Owen Hargreaves', club: 'Manchester United', position: 'MID' },
  { name: 'Wayne Rooney', club: 'Manchester United', position: 'ATT' },
  { name: 'Ruud van Nistelrooy', club: 'Manchester United', position: 'ATT' },
  { name: 'Carlos Tévez', club: 'Manchester United', position: 'ATT' },
  { name: 'Dimitar Berbatov', club: 'Manchester United', position: 'ATT' },
  { name: 'Ole Gunnar Solskjær', club: 'Manchester United', position: 'ATT' },

  // Manchester City
  { name: 'Joe Hart', club: 'Manchester City', position: 'GK', note: 'late' },
  { name: 'Shay Given', club: 'Manchester City', position: 'GK' },
  { name: 'Vincent Kompany', club: 'Manchester City', position: 'DEF', note: 'late' },
  { name: 'Micah Richards', club: 'Manchester City', position: 'DEF' },
  { name: 'Stephen Ireland', club: 'Manchester City', position: 'MID' },
  { name: 'Elano', club: 'Manchester City', position: 'MID' },
  { name: 'Gareth Barry', club: 'Manchester City', position: 'MID', note: 'late' },
  { name: 'Robinho', club: 'Manchester City', position: 'ATT' },
  { name: 'Carlos Tévez', club: 'Manchester City', position: 'ATT', note: 'late' },
  { name: 'Emmanuel Adebayor', club: 'Manchester City', position: 'ATT', note: 'late' },

  // Liverpool
  { name: 'Pepe Reina', club: 'Liverpool', position: 'GK' },
  { name: 'Jerzy Dudek', club: 'Liverpool', position: 'GK' },
  { name: 'Jamie Carragher', club: 'Liverpool', position: 'DEF' },
  { name: 'Sami Hyypiä', club: 'Liverpool', position: 'DEF' },
  { name: 'Steve Finnan', club: 'Liverpool', position: 'DEF' },
  { name: 'John Arne Riise', club: 'Liverpool', position: 'DEF' },
  { name: 'Steven Gerrard', club: 'Liverpool', position: 'MID' },
  { name: 'Xabi Alonso', club: 'Liverpool', position: 'MID' },
  { name: 'Javier Mascherano', club: 'Liverpool', position: 'MID' },
  { name: 'Dietmar Hamann', club: 'Liverpool', position: 'MID' },
  { name: 'Luis García', club: 'Liverpool', position: 'MID' },
  { name: 'Fernando Torres', club: 'Liverpool', position: 'ATT' },
  { name: 'Michael Owen', club: 'Liverpool', position: 'ATT' },
  { name: 'Dirk Kuyt', club: 'Liverpool', position: 'ATT' },
  { name: 'Robbie Fowler', club: 'Liverpool', position: 'ATT' },
  { name: 'Milan Baroš', club: 'Liverpool', position: 'ATT' },

  // Barcelona
  { name: 'Víctor Valdés', club: 'Barcelona', position: 'GK' },
  { name: 'Carles Puyol', club: 'Barcelona', position: 'DEF' },
  { name: 'Gerard Piqué', club: 'Barcelona', position: 'DEF' },
  { name: 'Dani Alves', club: 'Barcelona', position: 'DEF' },
  { name: 'Rafael Márquez', club: 'Barcelona', position: 'DEF' },
  { name: 'Éric Abidal', club: 'Barcelona', position: 'DEF' },
  { name: 'Xavi', club: 'Barcelona', position: 'MID' },
  { name: 'Andrés Iniesta', club: 'Barcelona', position: 'MID' },
  { name: 'Deco', club: 'Barcelona', position: 'MID' },
  { name: 'Sergio Busquets', club: 'Barcelona', position: 'MID' },
  { name: 'Yaya Touré', club: 'Barcelona', position: 'MID' },
  { name: 'Ronaldinho', club: 'Barcelona', position: 'ATT' },
  { name: 'Lionel Messi', club: 'Barcelona', position: 'ATT' },
  { name: "Samuel Eto'o", club: 'Barcelona', position: 'ATT' },
  { name: 'Thierry Henry', club: 'Barcelona', position: 'ATT' },
  { name: 'Patrick Kluivert', club: 'Barcelona', position: 'ATT' },
  { name: 'Henrik Larsson', club: 'Barcelona', position: 'ATT' },

  // Real Madrid
  { name: 'Iker Casillas', club: 'Real Madrid', position: 'GK' },
  { name: 'Roberto Carlos', club: 'Real Madrid', position: 'DEF' },
  { name: 'Sergio Ramos', club: 'Real Madrid', position: 'DEF' },
  { name: 'Fabio Cannavaro', club: 'Real Madrid', position: 'DEF' },
  { name: 'Pepe', club: 'Real Madrid', position: 'DEF' },
  { name: 'Míchel Salgado', club: 'Real Madrid', position: 'DEF' },
  { name: 'Zinedine Zidane', club: 'Real Madrid', position: 'MID' },
  { name: 'Luís Figo', club: 'Real Madrid', position: 'MID' },
  { name: 'David Beckham', club: 'Real Madrid', position: 'MID' },
  { name: 'Guti', club: 'Real Madrid', position: 'MID' },
  { name: 'Xabi Alonso', club: 'Real Madrid', position: 'MID', note: 'late' },
  { name: 'Kaká', club: 'Real Madrid', position: 'MID', note: 'late' },
  { name: 'Raúl', club: 'Real Madrid', position: 'ATT' },
  { name: 'Ronaldo (R9)', club: 'Real Madrid', position: 'ATT' },
  { name: 'Cristiano Ronaldo', club: 'Real Madrid', position: 'ATT', note: '2009+' },
  { name: 'Ruud van Nistelrooy', club: 'Real Madrid', position: 'ATT' },
  { name: 'Robinho', club: 'Real Madrid', position: 'ATT' },
  { name: 'Fernando Morientes', club: 'Real Madrid', position: 'ATT' },

  // Atletico Madrid
  { name: 'Maxi Rodríguez', club: 'Atletico Madrid', position: 'MID' },
  { name: 'Simão', club: 'Atletico Madrid', position: 'MID' },
  { name: 'Fernando Torres', club: 'Atletico Madrid', position: 'ATT' },
  { name: 'Sergio Agüero', club: 'Atletico Madrid', position: 'ATT' },
  { name: 'Diego Forlán', club: 'Atletico Madrid', position: 'ATT' },
  { name: 'Diego', club: 'Atletico Madrid', position: 'ATT', note: 'late' },

  // PSG
  { name: 'Mario Yepes', club: 'PSG', position: 'DEF' },
  { name: 'Sylvain Armand', club: 'PSG', position: 'DEF' },
  { name: 'Jérôme Rothen', club: 'PSG', position: 'MID' },
  { name: 'Claude Makélélé', club: 'PSG', position: 'MID', note: 'late' },
  { name: 'Pauleta', club: 'PSG', position: 'ATT' },
  { name: 'Ronaldinho', club: 'PSG', position: 'ATT', note: 'early (2001–03)' },
  { name: 'Guillaume Hoarau', club: 'PSG', position: 'ATT' },

  // Bayern Munich
  { name: 'Oliver Kahn', club: 'Bayern Munich', position: 'GK' },
  { name: 'Hans-Jörg Butt', club: 'Bayern Munich', position: 'GK', note: 'late' },
  { name: 'Philipp Lahm', club: 'Bayern Munich', position: 'DEF' },
  { name: 'Bixente Lizarazu', club: 'Bayern Munich', position: 'DEF' },
  { name: 'Willy Sagnol', club: 'Bayern Munich', position: 'DEF' },
  { name: 'Lúcio', club: 'Bayern Munich', position: 'DEF' },
  { name: 'Martín Demichelis', club: 'Bayern Munich', position: 'DEF' },
  { name: 'Daniel Van Buyten', club: 'Bayern Munich', position: 'DEF' },
  { name: 'Michael Ballack', club: 'Bayern Munich', position: 'MID' },
  { name: 'Bastian Schweinsteiger', club: 'Bayern Munich', position: 'MID' },
  { name: 'Mark van Bommel', club: 'Bayern Munich', position: 'MID' },
  { name: 'Owen Hargreaves', club: 'Bayern Munich', position: 'MID' },
  { name: 'Zé Roberto', club: 'Bayern Munich', position: 'MID' },
  { name: 'Hasan Salihamidžić', club: 'Bayern Munich', position: 'MID' },
  { name: 'Stefan Effenberg', club: 'Bayern Munich', position: 'MID', note: 'early' },
  { name: 'Franck Ribéry', club: 'Bayern Munich', position: 'MID' },
  { name: 'Arjen Robben', club: 'Bayern Munich', position: 'MID', note: 'late' },
  { name: 'Roy Makaay', club: 'Bayern Munich', position: 'ATT' },
  { name: 'Claudio Pizarro', club: 'Bayern Munich', position: 'ATT' },
  { name: 'Giovane Élber', club: 'Bayern Munich', position: 'ATT' },
  { name: 'Miroslav Klose', club: 'Bayern Munich', position: 'ATT' },
  { name: 'Luca Toni', club: 'Bayern Munich', position: 'ATT' },
  { name: 'Mario Gómez', club: 'Bayern Munich', position: 'ATT', note: 'late' },
];

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const PLAYERS: Player[] = RAW.map((p) => ({
  ...p,
  id: `${slug(p.club)}__${slug(p.name)}`,
}));

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  ATT: 'Attacker',
};
