"use client";

import { useArtists } from "@/features/artist/api/use-artists";
import { Artist } from "@/features/artist/schemas/artist";
import useTitleCast from "@/features/title/api/use-title-cast";
import { useSetTitleCast } from "@/features/title/api/use-title-mutations";
import { CastCredit } from "@/features/title/schemas/title";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useState } from "react";

interface CastRow {
  artistId: string;
  name: string;
  photoUrl?: string | null;
  character: string;
}

const toRows = (credits: CastCredit[]): CastRow[] =>
  [...credits]
    .sort((a, b) => a.order - b.order)
    .map((credit) => ({
      artistId: credit.artist.id,
      name: credit.artist.name,
      photoUrl: credit.artist.photoUrl,
      character: credit.character || "",
    }));

interface TitleCastManagerProps {
  titleId: string;
}

export default function TitleCastManager({ titleId }: TitleCastManagerProps) {
  const { data: cast, isPending } = useTitleCast(titleId);
  const [rows, setRows] = useState<CastRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncedCast, setSyncedCast] = useState<CastCredit[] | undefined>(undefined);

  const [artistSearch, setArtistSearch] = useState("");
  const { data: artistResults, isFetching: isSearchingArtists } = useArtists(
    { searchString: artistSearch, limit: 10 },
    { enabled: artistSearch.length > 0 },
  );

  // Sync local editable rows whenever the server cast changes (initial load, or after a save) —
  // done during render rather than in an effect, per React's "adjusting state" pattern.
  if (cast && cast !== syncedCast) {
    setSyncedCast(cast);
    setRows(toRows(cast));
    setIsDirty(false);
  }

  const { mutate: saveCast, isPending: isSaving } = useSetTitleCast({
    onSuccess: () => {
      setMessage("Cast updated.");
      setIsDirty(false);
    },
    onError: (error) => setMessage(error.message || "Failed to update cast."),
  });

  const availableArtists = (artistResults?.items || []).filter((artist) => !rows.some((row) => row.artistId === artist.id));

  const addArtist = (artist: Artist) => {
    setRows((prev) => [...prev, { artistId: artist.id, name: artist.name, photoUrl: artist.photoUrl, character: "" }]);
    setIsDirty(true);
    setArtistSearch("");
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const updateCharacter = (index: number, character: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, character } : row)));
    setIsDirty(true);
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    setMessage(null);
    saveCast({
      id: titleId,
      credits: rows.map((row, index) => ({
        artistId: row.artistId,
        character: row.character || undefined,
        order: index,
      })),
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {message && (
        <Alert severity={message.startsWith("Cast updated") ? "success" : "error"} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {!isPending && rows.length === 0 && <Typography sx={{ color: "text.secondary" }}>No cast members added yet.</Typography>}

      <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {rows.map((row, index) => (
          <Box
            key={row.artistId}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              p: "10px 14px",
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.02)",
            }}
          >
            <Avatar src={row.photoUrl || undefined} sx={{ width: 40, height: 40 }}>
              {row.name.charAt(0)}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: "0 0 180px" }}>
              <Typography noWrap sx={{ color: "#ffffff", fontWeight: 600 }}>
                {row.name}
              </Typography>
            </Box>

            <TextField
              size="small"
              placeholder="Character (optional)"
              value={row.character}
              onChange={(e) => updateCharacter(index, e.target.value)}
              sx={{ flex: 1 }}
            />

            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <IconButton size="small" disabled={index === 0} onClick={() => moveRow(index, -1)} aria-label="Move up">
                <KeyboardArrowUpIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)} aria-label="Move down">
                <KeyboardArrowDownIcon fontSize="small" />
              </IconButton>
            </Box>

            <IconButton aria-label="Remove" color="error" onClick={() => removeRow(index)}>
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Autocomplete
        options={availableArtists}
        loading={isSearchingArtists}
        getOptionLabel={(artist) => artist.name}
        filterOptions={(options) => options}
        inputValue={artistSearch}
        onInputChange={(_, value) => setArtistSearch(value)}
        onChange={(_, artist) => artist && addArtist(artist)}
        value={null}
        noOptionsText={artistSearch ? "No actors found" : "Type to search actors"}
        renderInput={(params) => <TextField {...params} size="small" placeholder="Add an actor to the cast..." />}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving..." : "Save Cast"}
        </Button>
      </Box>
    </Box>
  );
}
