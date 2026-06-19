// Best-effort player photos via the Wikipedia REST summary API (free, no key,
// CORS-enabled). Returns a thumbnail URL or null — when null, the player card
// shows its coloured placeholder instead. Results are cached for the session.
//
// Ambiguous / common names are pinned to the correct article so we don't pull
// the wrong person. If a guess 404s we just get null (placeholder), never a
// wrong photo, because disambiguation pages have no thumbnail.

const WIKI_TITLE: Record<string, string> = {
  Rodri: 'Rodri (footballer, born 1996)',
  Diego: 'Diego (footballer, born 1985)',
  Savinho: 'Sávio (footballer, born 2004)',
  Gavi: 'Gavi (footballer)',
  'Nico González': 'Nico González (footballer, born 2002)',
  Ederson: 'Ederson (footballer, born 1993)',
  Alisson: 'Alisson',
  Vitinha: 'Vitinha (footballer, born 2000)',
  'João Neves': 'João Neves (footballer, born 2004)',
  Marquinhos: 'Marquinhos (footballer, born 1994)',
  Reinildo: 'Reinildo Mandava',
  Koke: 'Koke (footballer)',
  Raphinha: 'Raphinha (footballer, born 1996)',
  'Pedro Neto': 'Pedro Neto (footballer, born 2000)',
  Estêvão: 'Estêvão (footballer, born 2007)',
  'Nico Williams': 'Nico Williams (footballer, born 2002)',
  Emerson: 'Emerson Royal',
  Casemiro: 'Casemiro',
  Joelinton: 'Joelinton',
  Endrick: 'Endrick',
  Pedri: 'Pedri',
  'Brahim Díaz': 'Brahim Díaz',
  'Fabián Ruiz': 'Fabián Ruiz',
};

const cache = new Map<string, string | null>();

export async function getPlayerPhoto(name: string): Promise<string | null> {
  if (cache.has(name)) return cache.get(name) ?? null;

  const title = WIKI_TITLE[name] ?? name;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    );
    if (!res.ok) {
      cache.set(name, null);
      return null;
    }
    const data = (await res.json()) as { thumbnail?: { source?: string } };
    const url = data.thumbnail?.source ?? null;
    cache.set(name, url);
    return url;
  } catch {
    cache.set(name, null);
    return null;
  }
}
