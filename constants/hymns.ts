// Hinário Presbiteriano (Novo Cântico) — local data bundled with the app.
// Hymns are maintained here by the developers, not added by admins at runtime.
//
// IMPORTANT: hymn lyrics in the Hinário Presbiteriano / Novo Cântico are largely
// under copyright (Editora Cultura Cristã / IPB). Only add lyrics here from a
// source the church is licensed to distribute. Each entry: number, title, lyrics.

export type Hymn = {
  number: number;
  title: string;
  lyrics: string;
};

export const HINARIO_PRESBITERIANO: Hymn[] = [
  // Hymns are added here from a licensed source.
];
