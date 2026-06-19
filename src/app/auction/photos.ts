// Best-effort player photos via Wikipedia (free, no key, CORS-enabled).
// Strategy, in order:
//   1. If the name is pinned below (ambiguous/common names), use that exact
//      article's image — guarantees the right person.
//   2. Otherwise search "<name> footballer" and take the top result's image.
//      This covers the large majority of players.
//   3. Fall back to the exact name as an article title.
// Returns a thumbnail URL or null. When null, the card shows its coloured
// placeholder. Results are cached for the session.
//
// Note: a handful of players simply have no free image on Wikipedia — those
// will always show the placeholder. That's the limit of a free, no-key source.

const WIKI_TITLE: Record<string, string> = {
  Rodri: 'Rodri (footballer, born 1996)',
  Diego: 'Diego (footballer, born 1985)',
  Savinho: 'Sávio (footballer, born 2004)',
  Gavi: 'Gavi (footballer)',
  'Nico González': 'Nico González (footballer, born 2002)',
  Ederson: 'Ederson (footballer, born 1993)',
  Vitinha: 'Vitinha (footballer, born 2000)',
  'João Neves': 'João Neves (footballer, born 2004)',
  Marquinhos: 'Marquinhos (footballer, born 1994)',
  Reinildo: 'Reinildo Mandava',
  Koke: 'Koke (footballer)',
  Raphinha: 'Raphinha (footballer, born 1996)',
  'Pedro Neto': 'Pedro Neto (footballer, born 2000)',
  Estêvão: 'Estêvão (footballer, born 2007)',
  Emerson: 'Emerson Royal',
  'Fabián Ruiz': 'Fabián Ruiz Peña',
};

const cache = new Map<string, string | null>();

async function summaryThumb(title: string): Promise<string | null> {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { thumbnail?: { source?: string } };
  return data.thumbnail?.source ?? null;
}

async function searchThumb(query: string): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=320`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
  };
  const pages = data.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0];
  return first?.thumbnail?.source ?? null;
}

export async function getPlayerPhoto(name: string): Promise<string | null> {
  if (cache.has(name)) return cache.get(name) ?? null;

  let url: string | null = null;
  try {
    const pinned = WIKI_TITLE[name];
    if (pinned) url = await summaryThumb(pinned);
    if (!url) url = await searchThumb(`${name} footballer`);
    if (!url) url = await summaryThumb(name);
  } catch {
    url = null;
  }
  cache.set(name, url);
  return url;
}
