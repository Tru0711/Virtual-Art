import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

const initial = {
  loading: true,
  error: '',
  artists: [],
  artworksByArtist: {},
};

export const useMuseumData = (apiArtistId) => {
  const [state, setState] = useState(initial);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setState((s) => ({ ...s, loading: true, error: '' }));
        const data = await api.getMuseumData({ artistId: apiArtistId || '' });
        if (!alive) return;

        const artists = Array.isArray(data?.artists) ? data.artists : [];
        const artworksByArtist = data?.artworksByArtist || {};

        setState({ loading: false, error: '', artists, artworksByArtist });
      } catch (e) {
        if (!alive) return;
        setState({ ...initial, loading: false, error: e?.message || 'Failed to load museum data' });
      }
    };

    load();
    return () => { alive = false; };
  }, [apiArtistId]);

  return state;
};

