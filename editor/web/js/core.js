/*
 * Morphe Visual Settings Editor: web preview.
 *
 * Everything below reads catalogue.json, which tools/extract_catalogue.py generates from a
 * morphe-patches checkout. Nothing about a preference (key, type, default, title, summary,
 * entries, dependencies) is typed by hand here. This file only adds the *visual* layer:
 *
 *   SECTIONS   which catalogue screens feed each Live View tab
 *   ADAPTERS   which preference keys have a visual adapter, and of which kind
 *   SCENES     the mock YouTube UI each tab draws, tagging components with their key
 *
 * Any preference without an adapter falls back to its ordinary widget under "Misc".
 */
"use strict";
// Data, state and shared helpers: icons, screens, adapters, list designs, the component helper and the animation clock.
// The editor is split into plain scripts loaded in order (see index.html); they share one global scope.


// ------------------------------------------------------------------ icons
const P = {
  wifi: "M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8 3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4 2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z",
  power: "M13 3h-2v10h2V3zm4.83 2.17-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.17.99-4.1 2.58-5.42L6.17 5.17A8.93 8.93 0 0 0 3 12a9 9 0 0 0 18 0c0-2.74-1.23-5.18-3.17-6.83z",
  reset: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z",
  cast: "M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  cc: "M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z",
  gear: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z",
  down: "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
  full: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
  prev: "M6 6h2v12H6zm3.5 6 8.5 6V6z",
  next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  play: "M8 5v14l11-7z",
  pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
  like: "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z",
  dislike: "M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z",
  share: "M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z",
  dl: "M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z",
  comment: "M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z",
  more: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  moreh: "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  subs: "M20 8H4V6h16v2zm-2-6H6v2h12V2zm4 10v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-6 4-6-3.27v6.53L16 16z",
  you: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  mic: "M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z",
  loop: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",
  mute: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
  vol: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
  bright: "M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  pip: "M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z",
  reload: "M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  link: "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z",
  speed: "M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z",
  clock: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z",
  plist: "M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm13-1v8l6-4z",
  save: "M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z",
  crop: "M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z",
  flag: "M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z",
  remix: "M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
  clip: "M9.64 7.64c.23-.5.36-1.05.36-1.64a4 4 0 1 0-4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36A3.9 3.9 0 0 0 6 14a4 4 0 1 0 4 4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM19 3l-6 6 2 2 7-7V3z",
  shop: "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2h2V8h4v2h2V8h2v12z",
  spark: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z",
  music: "M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  translate: "M12.87 15.07l-2.54-2.51.03-.03A17.5 17.5 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z",
  timer: "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4a9 9 0 1 0 9 9c0-2.12-.74-4.07-1.97-5.61zM12 20a7 7 0 1 1 0-14 7 7 0 0 1 0 14z",
  help: "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
  tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
  chat: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
  fire: "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z",
  close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  sort: "M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z",
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  dollar: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  emoji: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z",
  gift: "M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68A3.01 3.01 0 0 0 9 2C7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4l3.38 4.6L17 10.83 14.92 8H20v6z",
  shorts: "M17.77 10.32l-1.2-.5L18 9.06a3.74 3.74 0 0 0-3.5-6.62L6 6.94a3.74 3.74 0 0 0 .23 6.74l1.2.49L6 14.93a3.75 3.75 0 0 0 3.5 6.63l8.5-4.5a3.74 3.74 0 0 0-.23-6.74zM10 14.65v-5.3L15 12l-5 2.65z",
  queue: "M4 6h12v2H4zm0 4h12v2H4zm0 4h8v2H4zm10 0v6l5-3z",
  vr: "M20.74 6H3.21C2.55 6 2 6.57 2 7.28v10.44c0 .7.55 1.28 1.23 1.28h4.79c.52 0 .96-.33 1.14-.79l1.4-3.48c.23-.59.79-1.01 1.44-1.01s1.21.42 1.45 1.01l1.39 3.48c.19.46.63.79 1.11.79h4.79c.71 0 1.26-.57 1.26-1.28V7.28c0-.7-.55-1.28-1.26-1.28zM7.5 14.62c-1.17 0-2.13-.95-2.13-2.12 0-1.17.96-2.13 2.13-2.13s2.12.96 2.12 2.13-.95 2.12-2.12 2.12zm9 0c-1.17 0-2.13-.95-2.13-2.12 0-1.17.96-2.13 2.13-2.13s2.12.96 2.12 2.13-.95 2.12-2.12 2.12z",
  vibration: "M0 15h2V9H0v6zm3 2h2V7H3v10zm19-8v6h2V9h-2zm-3 8h2V7h-2v10zM16.5 3h-9C6.67 3 6 3.67 6 4.5v15c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zM16 19H8V5h8v14z",
  phone7: "M16.5 3h-9C6.67 3 6 3.67 6 4.5v15c0 .83.67 1.5 1.5 1.5h9c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5zM16 19H8V5h8v14z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  tv: "M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z",
  eye: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
  gesture: "M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z",
  layout: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  palette: "M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",
  layers: "M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
  check: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  toggle: "M17 7H7a5 5 0 0 0 0 10h10a5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  arrow: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  expand: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z",
  phone: "M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  restart: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z",
  up: "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z",
  bookmark: "M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15-5-2.18L7 18V5h10v13z",
  pencil: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
  list: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
};
const I = (n, cls = "ico", extra = "") => `<svg class="${cls}" viewBox="0 0 24 24" ${extra}><path d="${P[n] || P.info}"/></svg>`;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Dummy artwork: gradients only, no external images.
// The two main demo videos are small SVG scenes (an alpine lake at dusk, a city at night)
const svgArt = svg => `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">${svg}</svg>`)}') center/cover no-repeat #1b1f3a`;
const ART_LAKE = svgArt(`<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27325e"/><stop offset=".55" stop-color="#b3657f"/><stop offset="1" stop-color="#f3b27a"/></linearGradient>
<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d5a8c"/><stop offset="1" stop-color="#1c2140"/></linearGradient></defs>
<rect width="160" height="58" fill="url(#s)"/><circle cx="112" cy="47" r="7" fill="#ffe2b0" opacity=".95"/>
<path d="M0 50 L22 30 L34 40 L52 22 L70 42 L84 32 L104 48 L124 28 L142 41 L160 33 V58 H0Z" fill="#6b5585"/>
<path d="M0 56 L18 44 L30 50 L46 38 L62 51 L80 42 L98 53 L118 40 L136 52 L160 44 V60 H0Z" fill="#43375f"/>
<rect y="58" width="160" height="32" fill="url(#w)"/><rect x="104" y="60" width="16" height="1.4" rx=".7" fill="#ffe2b0" opacity=".6"/><rect x="107" y="64" width="10" height="1.2" rx=".6" fill="#ffe2b0" opacity=".4"/><rect x="109" y="68" width="6" height="1" rx=".5" fill="#ffe2b0" opacity=".25"/>
<path d="M8 90 L14 66 L20 90Z M20 90 L27 60 L34 90Z M134 90 L141 63 L148 90Z M146 90 L151 70 L156 90Z" fill="#141830"/>`);
const ART_CITY = svgArt(`<defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26346e"/><stop offset=".55" stop-color="#7a5aa6"/><stop offset="1" stop-color="#e3958c"/></linearGradient></defs>
<rect width="160" height="90" fill="url(#n)"/>${[[12, 8], [30, 15], [52, 6], [76, 12], [98, 5], [120, 14], [146, 9], [64, 20], [138, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".6" fill="#fff" opacity=".8"/>`).join("")}

<path d="M0 90 V58 H10 V50 H20 V62 H28 V40 H40 V56 H48 V46 H58 V60 H66 V34 H74 V30 H80 V60 H90 V48 H102 V64 H110 V42 H122 V56 H132 V50 H144 V62 H152 V54 H160 V90Z" fill="#2a2546"/>
${[[30, 44], [34, 48], [30, 52], [68, 38], [72, 42], [68, 50], [76, 34], [92, 52], [98, 56], [112, 46], [118, 50], [114, 54], [136, 54], [50, 50], [14, 56]].map(([x, y]) => `<rect x="${x}" y="${y}" width="2" height="2" fill="#ffd36e" opacity=".85"/>`).join("")}`);
const ART = [
  ART_LAKE,
  "radial-gradient(circle at 30% 60%,#ff6b6b 0 18%,transparent 19%),linear-gradient(135deg,#232526,#414345)",
  "linear-gradient(160deg,#614385,#516395)",
  ART_CITY,
  "linear-gradient(135deg,#134e5e,#71b280)",
  "radial-gradient(circle at 40% 40%,#fff3 0 20%,transparent 21%),linear-gradient(135deg,#c94b4b,#4b134f)",
  "linear-gradient(180deg,#355c7d,#6c5b7b,#c06c84)",
  "radial-gradient(circle at 75% 70%,#f9d423 0 14%,transparent 15%),linear-gradient(135deg,#1f4037,#99f2c8)",
];
const AV = ["#e57373", "#64b5f6", "#81c784", "#ffb74d", "#ba68c8", "#4db6ac", "#f06292", "#a1887f"];
const VIDEOS = [
  { t: "Building a tiny cabin in the Norwegian forest", c: "Fjord & Timber", v: "1.2M views", a: "3 days ago", d: "18:42" },
  { t: "I tried every budget mechanical keyboard so you don't have to", c: "Switch Lab", v: "486K views", a: "1 week ago", d: "24:10" },
  { t: "Night train from Oslo to Bodø: 18 hours north", c: "Slow Rails", v: "2.9M views", a: "2 months ago", d: "41:05" },
  { t: "The physics of a perfect skipping stone", c: "Pocket Science", v: "731K views", a: "5 days ago", d: "12:37" },
  { t: "Lo-fi beats for late night coding", c: "Midnight Tapes", v: "9.1M views", a: "1 year ago", d: "2:00:00" },
  { t: "Restoring a 1974 film camera", c: "Darkroom Diaries", v: "212K views", a: "4 days ago", d: "16:03" },
];
const thumb = (i, style = "", extra = "") => `<div class="thumb" style="background:${ART[i % ART.length]};aspect-ratio:16/9;${style}">${extra}</div>`;
const av = (i, s = 36) => `<div class="av" style="width:${s}px;height:${s}px;background:${AV[i % AV.length]}"></div>`;

// ------------------------------------------------------------------ sections
// scopes: [screen, subScreen] pairs from the catalogue. A preference that has no adapter
// but lives in one of a section's scopes is listed under that section's Misc.
const SECTIONS = [
  { id: "player", icon: "play", title: "Player controls", scopes: [["PLAYER", "morphe_overlay_buttons_screen"]] },
  { id: "endscreen", icon: "tv", title: "End screen", scopes: [] },
  { id: "seekbar", icon: "gesture", title: "Seekbar & gestures", scopes: [["SEEKBAR", null], ["PLAYER", "morphe_disable_haptic_feedback"]] },
  { id: "watch", icon: "like", title: "Watch page", scopes: [["PLAYER", "morphe_action_buttons_screen"], ["PLAYER", "morphe_hide_description_components_screen"]] },
  { id: "fullscreen", icon: "full", title: "Fullscreen", scopes: [["SWIPE_CONTROLS", null], ["PLAYER", "morphe_disable_fullscreen_gestures"]] },
  { id: "feed", icon: "home", title: "Home feed", scopes: [["FEED", null], ["FEED", "morphe_hide_filter_bar_screen"]] },
  { id: "shorts", icon: "shorts", title: "Shorts", scopes: [["SHORTS", null], ["SHORTS", "morphe_shorts_player_screen"]] },
  { id: "nav", icon: "layout", title: "Navigation", scopes: [["GENERAL", "morphe_navigation_bar_screen"], ["GENERAL", "morphe_toolbar_screen"]] },
  { id: "comments", icon: "comment", title: "Comments", scopes: [["PLAYER", "morphe_comments_screen"], ["PLAYER", "morphe_live_chat_translate_screen"]] },
  { id: "flyout", icon: "tune", title: "Player menu", scopes: [["PLAYER", "morphe_hide_player_flyout"]] },
  { id: "captions", icon: "cc", title: "Captions", scopes: [["PLAYER", "morphe_captions_screen"], ["PLAYER", "morphe_captions_advanced"]] },
  { id: "miniplayer", icon: "pip", title: "Miniplayer", scopes: [["PLAYER", "morphe_miniplayer_screen"], ["PLAYER", "morphe_notification_media_screen"]] },
  { id: "misc", icon: "list", title: "Miscellaneous", scopes: null },
];

// Experimental grouped layout: six screens, each split into tabs that sit right under the live preview.
// A tab is one of the screens above, so switching tabs switches the preview (and its animations) too.
const GROUPS = [
  { id: "g_player", icon: "play", title: "Player", tabs: [["player", "Controls"], ["seekbar", "Seekbar & gestures"], ["fullscreen", "Fullscreen"], ["flyout", "Player menu"], ["miniplayer", "Miniplayer"]] },
  { id: "g_playback", icon: "speed", title: "Playback", tabs: [["playback", "Video & audio"], ["behaviour", "Behaviour"], ["endscreen", "End screen"], ["captions", "Captions"], ["sponsorblock", "SponsorBlock"]] },
  { id: "g_watch", icon: "like", title: "Watch page", tabs: [["watch", "Actions"], ["description", "Description"], ["ambient", "Ambient mode"], ["comments", "Comments"], ["danmaku", "Flying comments"]] },
  { id: "g_feed", icon: "home", title: "Feed", tabs: [["feed", "Home"], ["shorts", "Shorts"], ["ads", "Ads"], ["dearrow", "DeArrow"]] },
  { id: "g_browse", icon: "layout", title: "Browsing", tabs: [["channel", "Channel page"], ["explore", "Explore menu"], ["nav", "Navigation"]] },
  { id: "g_app", icon: "palette", title: "App", tabs: [["look", "App look"], ["snackbar", "Snackbar"], ["misc", "Miscellaneous"]] },
];
let grouped = true; // tabs are the default layout; the menu toggle switches back to 24 screens
const lastTab = {};
const groupOf = id => GROUPS.find(g => g.tabs.some(([t]) => t === id)) || GROUPS[GROUPS.length - 1];
// tabs follow Morphe's order unless they were rearranged (hold a tab, then drag it)
let tabOrder = {};
const tabsOf = g => { const base = g.tabs.filter(([t]) => SECTIONS.some(s => s.id === t)), o = tabOrder[g.id]; if (!o) return base; const pos = id => { const i = o.indexOf(id); return i < 0 ? 1e3 + base.findIndex(([t]) => t === id) : i; }; return [...base].sort((a, b) => pos(a[0]) - pos(b[0])); };

// ------------------------------------------------------------------ adapters
// Kinds mirror the proposed native adapters:
//   vis       VisibilityPreview  (hide/show a component)
//   overlay   OverlayPreview     (overlay or card populated with dummy content)
//   gesture   GesturePreview     (animated touch demo, plays while selected)
//   layout    LayoutPreview      (arrangement / ordering choice)
//   style     StylePreview       (opacity, size, colour, shape)
//   behaviour BehaviourPreview   (playback behaviour, animated)
// Keys are written without the "morphe_" prefix.
const A = {};
// Hints the installed Morphe has outgrown (in the app, see app-pre.js): a list value this editor has
// no story for (Morphe adds and renames values often), or a story that failed on live data. Such a
// value is shown plainly: no comparison, no animation, never a guess drawn as if it were known.
const STALE_VALUES = {}; // key -> Set of values (as strings) the hints don't know
const BROKEN = new Set(); // keys whose story threw
const hintOk = (k, ...vals) => !BROKEN.has(k) && !(STALE_VALUES[k] && vals.some(v => STALE_VALUES[k].has(String(v))));
// A story failed: it is not played again in this visit, and the error still reaches the console and the checks.
function hintFailed(k, err) { BROKEN.add(k); setTimeout(() => { throw err; }); }
// A setting whose kind changed under its key (a switch that became a list): every hint written for the
// old kind goes, and the setting is a plain row.
function dropHints(k) { delete A[k]; if (typeof SCN !== "undefined") delete SCN[k]; if (typeof DEMOS !== "undefined") delete DEMOS[k]; }
const def = (section, kind, keys, extra = {}) => keys.split(/\s+/).filter(Boolean).forEach(k => { A["morphe_" + k] = { section, kind, ...extra }; });

def("player", "vis", "hide_collapse_button hide_autoplay_button hide_captions_button hide_cast_button hide_settings_button hide_player_previous_next_buttons hide_fullscreen_button");
def("player", "vis", "copy_video_link_button playback_speed_dialog_button video_quality_dialog_button loop_video_button mute_video_button pip_button_overlay reload_video_button save_to_watch_later_button playlist_panel_button play_all_button fullscreen_video_scale_button video_delay_button_overlay external_downloader_overlay_button");
def("player", "style", "hide_player_control_buttons_background player_control_buttons_background_opacity player_overlay_opacity");

def("endscreen", "overlay", "hide_end_screen_cards hide_autoplay_preview hide_end_screen_suggested_video");
def("endscreen", "vis", "hide_info_cards hide_channel_watermark hide_end_screen_store_banner");
def("endscreen", "behaviour", "autoplay_mode");

def("seekbar", "vis", "hide_seekbar hide_timestamp seekbar_thumbnail_preview hide_player_gesture_hints hide_chapters_timeline_button");
def("seekbar", "gesture", "tap_to_seek slide_to_seek disable_precise_seeking_gesture");
def("seekbar", "style", "seekbar_custom_color seekbar_custom_color_primary seekbar_custom_color_accent");

def("watch", "vis", "hide_channel_bar hide_join_membership_button hide_action_bar hide_like_dislike_button hide_share_button hide_remix_button hide_thanks_button hide_download_button hide_clip_button hide_save_button hide_report_button hide_shop_button hide_ask_button hide_hype_button hide_promote_button hide_stop_ads_button hide_more_button hide_comments_section hide_comments_preview_comment hide_info_panels");
def("watch", "overlay", "hide_player_related_videos");
def("watch", "layout", "video_action_bar_layout");
def("watch", "behaviour", "disable_like_subscribe_glow");

def("fullscreen", "vis", "hide_video_title hide_quick_actions hide_quick_actions_like_button hide_quick_actions_dislike_button hide_quick_actions_comments_button hide_quick_actions_save_button hide_quick_actions_share_button hide_quick_actions_more_button hide_quick_actions_playlist_button hide_quick_actions_mix_button hide_quick_actions_more_videos_button hide_quick_actions_ask_button hide_quick_actions_live_chat_button hide_live_chat_replay_button");
def("fullscreen", "overlay", "hide_player_related_videos_overlay");
def("fullscreen", "gesture", "swipe_left_zone swipe_right_zone swipe_seek");
def("fullscreen", "style", "fullscreen_video_scale swipe_overlay_style");

def("feed", "vis", "feed_watch_later_button native_queue_thumbnail_button hide_video_labels hide_filter_bar_in_feed hide_video_thumbnail hide_seekbar_thumbnail hide_view_count hide_upload_time hide_shorts_home hide_community_posts hide_mix_playlists hide_live_streams hide_youtube_doodles");
def("feed", "layout", "feed_card_layout");

def("shorts", "vis", "hide_shorts_like_button hide_shorts_comments_button hide_shorts_share_button hide_shorts_remix_button hide_shorts_sound_button hide_shorts_save_button hide_shorts_channel_bar hide_shorts_subscribe_button hide_shorts_join_button hide_shorts_video_title hide_shorts_sound_metadata_label hide_shorts_location_label hide_shorts_full_video_link_label hide_shorts_info_panel hide_shorts_tagged_products hide_shorts_shop_button hide_shorts_use_template_button hide_shorts_effect_button hide_shorts_green_screen_button hide_shorts_hashtag_button hide_shorts_super_thanks_button hide_shorts_ai_button hide_shorts_preview_comment hide_shorts_navigation_bar hide_shorts_use_sound_button");
def("shorts", "gesture", "disable_shorts_double_tap_to_like");

def("nav", "vis", "hide_navigation_bar hide_home_button hide_shorts_button hide_create_button hide_subscriptions_button hide_notifications_button hide_navigation_button_labels show_search_button show_settings_button show_watch_later_button hide_navigation_new_content_dot");
def("nav", "vis", "hide_toolbar_create_button hide_toolbar_notification_button hide_toolbar_search_button hide_toolbar_chat_button show_toolbar_settings_button");
def("nav", "layout", "swap_create_with_notifications_button header_logo");
def("nav", "style", "narrow_navigation_buttons navigation_bar_style disable_icon_only_navigation_buttons");

def("comments", "vis", "hide_comments_filter_bar_options hide_comments_ai_chat_summary hide_comments_community_guidelines hide_comments_channel_guidelines hide_comments_emoji_button hide_comments_timestamp_button hide_comments_gif_button hide_comments_thanks_button hide_comments_create_a_short_button hide_comments_dislike_button hide_comments_translate_button hide_comments_menu_button hide_comments_gift_button hide_comments_info_button");

def("flyout", "vis", "hide_player_flyout_quality hide_player_flyout_captions hide_player_flyout_speed hide_player_flyout_sleep_timer hide_player_flyout_loop_video hide_player_flyout_ambient_mode hide_player_flyout_lock_screen hide_player_flyout_stable_volume hide_player_flyout_audio_track hide_player_flyout_listen_with_youtube_music hide_player_flyout_watch_in_vr hide_player_flyout_on_the_go hide_player_flyout_additional_settings hide_player_flyout_help pip_button_flyout video_delay_button_flyout save_to_watch_later_flyout_button");

def("captions", "style", "caption_scale secondary_caption_language");
def("captions", "behaviour", "stable_caption_blocks");
def("captions", "vis", "captions_in_pip");

def("miniplayer", "layout", "miniplayer_type");
def("miniplayer", "vis", "miniplayer_hide_title miniplayer_hide_overlay_buttons hide_notification_media_prev_next disable_notification_media_seekbar");
def("miniplayer", "style", "miniplayer_disable_rounded_corners miniplayer_opacity miniplayer_width_dip");

// Stock (unpatched YouTube) value overrides, where "false" is not stock.
const STOCK = {
  morphe_seekbar_thumbnail_preview: true,
  morphe_swap_create_with_notifications_button: false,
  morphe_autoplay_mode: "AUTO",
  morphe_miniplayer_type: "DEFAULT",
  morphe_player_overlay_opacity: 100,
  morphe_player_control_buttons_background_opacity: 30,
  morphe_caption_scale: 100,
  morphe_secondary_caption_language: "off",
  morphe_fullscreen_video_scale: "DEFAULT",
  morphe_video_action_bar_layout: "DEFAULT",
  morphe_feed_card_layout: "DEFAULT",
  morphe_header_logo: "DEFAULT",
  morphe_navigation_bar_style: "DEFAULT",
  morphe_miniplayer_opacity: 100,
  morphe_miniplayer_width_dip: 192,
  morphe_swipe_left_zone: "OFF",
  morphe_swipe_right_zone: "OFF",
};

const KIND_NAME = { vis: "VisibilityPreview", overlay: "OverlayPreview", gesture: "GesturePreview", layout: "LayoutPreview", style: "StylePreview", behaviour: "BehaviourPreview", fallback: "FallbackPreference", list: "FallbackPreference" };

// ------------------------------------------------------------------ state
let CAT, PREF = {}, mode = "mod", section = "player", selected = null;
// Setting values. THE ONE WAY a value changes is setPref(k, v) (or setPrefs for several): it records
// the key in changedPrefs. In the app, every save sends exactly those keys to Morphe and empties
// the set (app-post.js); the preview saves all its changed values to localStorage (boot.js). loadPrefs() is for values that come from outside (the
// defaults at start, saved values, a value Morphe kept): they are not changes to send back.
// `state` reads like a plain object (state[k], { ...state }, for...in), but writing state[k]
// directly throws, so no change can skip the save path.
const prefValues = {};
const changedPrefs = new Set();
const state = new Proxy(prefValues, {
  set(t, k) { throw new TypeError(`Change settings with setPref(${JSON.stringify(String(k))}, value), not state[k] = value`); },
  deleteProperty(t, k) { throw new TypeError(`Settings can't be deleted (${String(k)})`); },
});
function setPref(k, v) { if (prefValues[k] === v && k in prefValues) return; prefValues[k] = v; changedPrefs.add(k); }
function setPrefs(values) { for (const k in values) setPref(k, values[k]); }
function loadPrefs(values) { for (const k in values) prefValues[k] = values[k]; }
const ghosts = new Set();
// Settings whose preview acts on an element another setting can hide. While one of them is selected,
// that element is drawn as a ghost (dimmed, dashed) even when your settings hide it, so the demo
// still has something to act on: a hidden seekbar still shows for tap to seek, thumbnails, colours.
const SEEKBAR_USERS = "tap_to_seek slide_to_seek seekbar_thumbnail_preview hide_player_gesture_hints disable_precise_seeking_gesture seekbar_custom_color seekbar_custom_color_primary seekbar_custom_color_accent custom_seekbar_thumb custom_seekbar_thumb_scale_type custom_seekbar_thumb_file";
const NEEDS = Object.fromEntries(SEEKBAR_USERS.split(" ").map(k => ["morphe_" + k, ["morphe_hide_seekbar"]]));
NEEDS.morphe_swap_save_and_queue_actions = ["morphe_save_to_watch_later_button"];
NEEDS.morphe_video_quality_dialog_button_resolution = ["morphe_video_quality_dialog_button"];
NEEDS.morphe_sb_create_new_segment_step = ["morphe_sb_create_new_segment"]; // the step acts in the editor that button opens
const lentTo = (k, x) => !!k && (NEEDS[k] || []).includes(x) && !shown(x);
const LS = "morphe-visual-editor-v1";
const store = {
  load() { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } },
  save() { try { localStorage.setItem(LS, JSON.stringify({ state: changedOnly(), section })); } catch { /* storage unavailable */ } },
};

function initialValue(p) {
  let d = p.default;
  const vals = (p.entries || []).map(e => e.value);
  if (p.type === "boolean") return d === true;
  if (p.type === "integer" || p.type === "long" || p.type === "float") {
    if (typeof d === "number") return d;
    if (vals.length) return Number(vals[0]);
    return 0;
  }
  if (p.type === "enum") {
    if (vals.length && !vals.includes(d)) return vals[0];
    return d;
  }
  // a default Morphe works out while it runs (computedDefault in the catalogue): a list opens on its first choice
  if (d == null && vals.length) return vals[0];
  return d ?? "";
}
const defaults = {};
function changedOnly() { const o = {}; for (const k in state) if (JSON.stringify(state[k]) !== JSON.stringify(defaults[k])) o[k] = state[k]; return o; }

const ad = k => A[k];
const isHideKey = k => /(^|_)hide_|^morphe_disable_/.test(k) && !/^morphe_disable_.*(gesture|double_tap)/.test(k);
function stockOf(k) {
  if (k in STOCK) return STOCK[k];
  const p = PREF[k];
  if (!p) return false;
  if (p.type === "boolean") return false;
  return defaults[k];
}
const V = k => (mode === "orig" ? stockOf(k) : prefValues[k]); // the hot read: straight from the values, not through the guard
function shown(k) { const v = V(k); return isHideKey(k) ? !v : !!v; }
function parentsOk(k) { return classicParentsOk(k) && availOk(k); }
function classicParentsOk(k) {
  const p = PREF[k]; if (!p || !p.parents || !p.parents.length) return true;
  const any = p.parents.filter(x => x.mode === "any");
  const rest = p.parents.filter(x => x.mode !== "any");
  const okRest = rest.every(x => x.mode === "not" ? !state[x.key] : !!state[x.key]);
  const okAny = !any.length || any.some(x => !!state[x.key]);
  return okRest && okAny;
}
// Morphe leaves a few titles blank because the row is a drawing of its own
const TITLE_FALLBACK = { morphe_swipe_zone_preview: "Press for Swipe zone preview" };
const title = k => {
  const p = PREF[k]; if (!p) return k;
  const t = (p.title && p.title.trim()) || TITLE_FALLBACK[k] || k.replace(/^morphe_/, "").replace(/_/g, " ");
  return unitOf(k) && !/\(seconds\)$/i.test(t) ? `${t} (seconds)` : t;
};
// a setting whose choices are all "N seconds" (read from the app's own entries, so a new one is caught
// too): its title says "(seconds)" once and the choices are short ("0.5s"), so they fit on fewer lines
const unitCache = {};
const unitOf = k => {
  if (k in unitCache) return unitCache[k];
  if (!PREF[k]) return false;
  const e = PREF[k].entries || [];
  return (unitCache[k] = e.length > 1 && e.every(x => /^[\d.]+\s*seconds?$/.test(String(x.label))));
};
// ------------------------------------------------------------------ list designs
// Three looks for the settings list, picked at the bottom of the screen menu:
//   "classic"  Morphe's own titles; visible elements show Shown / Hidden, other switches stay switches
//   "toggles"  Morphe's own titles; every on/off setting is a switch
//   "clean"    (default) titles without the leading Hide / Show / Enable / Disable, and a two-way
//              toggle that names both states ("Show | Hide", "On | Off")
// "clean" is derived at runtime from Morphe's title, so renamed or new settings convert by themselves.
// A setting it can't read (no title) keeps Morphe's look and is listed at the end of its screen.
let design = "clean";
const CLEAN_RE = /^(hide|show|enable|disable)\s+(.+)$/i;
const CLEAN_MODE = new Set(["morphe_native_snackbar"]);
function cleanOf(k) {
  const p = PREF[k]; if (!p || p.type !== "boolean" || OFF_LIST.has(k)) return null;
  const t = p.title && p.title.trim(); if (!t) return null;
  const a = A[k], visual = !!a && (a.kind === "vis" || a.kind === "overlay");
  const m = CLEAN_RE.exec(t);
  if (!m) return { title: t, labels: ["Off", "On"] };
  const rest = m[2].trim(); if (!rest) return null;
  // "Show only in fullscreen" names no object: "Only in fullscreen: Hide | Show" would read backwards
  // (Show only = hidden elsewhere), so such a title keeps its words and Off / On
  // The same for a title that chooses how something is shown, not whether: "Show dislikes as percentage"
  // (Hide would hide no dislikes) and the snackbar setting (the messages show either way).
  if (/^only\b/i.test(rest) || (/^show$/i.test(m[1]) && /\sas\s/i.test(rest)) || CLEAN_MODE.has(k)) return { title: t, labels: ["Off", "On"] };
  const nice = rest.charAt(0).toUpperCase() + rest.slice(1);
  const verb = m[1].toLowerCase();
  const labels = verb === "hide" ? ["Show", "Hide"] : verb === "show" ? ["Hide", "Show"]
    : verb === "enable" ? (visual ? ["Hide", "Show"] : ["Off", "On"]) : ["On", "Off"];
  return { title: nice, labels };
}
const shownTitle = k => (design === "clean" && cleanOf(k)?.title) || title(k);
// The word a setting's own toggle shows for a value (Hide/Show, Off/On, or On/Off for a "Disable X"
// turned into "X"). Every place that names a setting's state uses it, so the words always match the card.
const stateWord = (k, on) => { const c = design === "clean" && cleanOf(k); return c ? c.labels[on ? 1 : 0] : on ? "On" : "Off"; };
const cleanBroken = k => design === "clean" && PREF[k] && PREF[k].type === "boolean" && !OFF_LIST.has(k) && !cleanOf(k);
// Hide / Off always sit on the left and Show / On on the right; a thumb slides to the current one
const NEG_WORD = new Set(["Hide", "Off"]);
// a choice that turns the thing off (SponsorBlock's Disable): grey when chosen, like a default, never the green
// of a choice that does something (Max, Nov 24), and it stays at the end of its row (controlFor)
const OFF_CHOICE = /^(disable|disabled|none|never|nothing)$/i;
function toggleHTML(k) {
  const c = cleanOf(k), on = !!V(k), [l0, l1] = c.labels, cur = on ? l1 : l0;
  const [left, right] = NEG_WORD.has(l0) ? [l0, l1] : [l1, l0];
  return `<button class="lt7" role="switch" data-sw="${k}" aria-checked="${on}" data-at="${cur === left ? "l" : "r"}" data-tone="${NEG_WORD.has(cur) ? "neg" : "pos"}" aria-label="${esc(c.title)}: ${cur}"><i></i><span>${left}</span><span>${right}</span></button>`;
}
function entryLabel(k, v) { const e = (PREF[k]?.entries || []).find(x => String(x.value) === String(v)); return e ? e.label : String(v); }

// ------------------------------------------------------------------ component helper
// C(key, inner, {blk, cls, style, tag}) wraps a component so it can be selected, ghosted or hidden.
function C(k, inner, o = {}) {
  const full = "morphe_" + k;
  // a setting this YouTube version doesn't have: the stock element stays, but it isn't tied to a setting
  if (PREF[full] && !inVersion(full)) return `<${o.tag || "div"} class="${o.blk ? "blk" : ""}" style="position:relative;${o.style || ""}">${inner}</${o.tag || "div"}>`;
  const a = ad(full);
  const cls = ["c"];
  if (o.blk) cls.push("blk");
  if (o.cls) cls.push(o.cls);
  if (a && (a.kind === "vis" || a.kind === "overlay") && !shown(full)) cls.push("off");
  if (ghosts.has(full) || lentTo(selected, full)) cls.push("ghost");
  // also: one or more other settings (space-separated) this element stands for in the preview
  const also = o.also ? o.also.split(" ").map(x => "morphe_" + x) : [];
  if (selected === full || also.includes(selected)) cls.push("sel");
  return `<${o.tag || "div"} class="${cls.join(" ")}" data-k="${full}" ${also.length ? `data-also="${also.join(" ")}"` : ""} data-label="${esc(title(full))}" style="${o.style || ""}">${inner}</${o.tag || "div"}>`;
}
const pb = (k, icon, o = {}) => C(k, `<div class="pbtn ${o.bg ? "ctrlbg" : ""}" style="${o.s ? `width:${o.s}px;height:${o.s}px` : ""}">${icon}</div>`, o);

// ------------------------------------------------------------------ animation clock
// One clock for every animation. Each kind of animation runs on its own track: "demo" (the live
// preview loops), "scenario" (an Off / On comparison's lifetime), "steps" (the steps of the
// comparison's current pass), "tut" and "tutPage" (the tutorial). Starting or stopping a track
// cancels everything still queued on it, and a callback from an older run can never fire, so one
// animation can't leak into, or cancel, the next one.
const clock = (() => {
  const tracks = {};
  const tr = name => tracks[name] || (tracks[name] = { run: 0, ids: new Set() });
  const api = {
    stop(name) { const t = tr(name); t.run++; t.ids.forEach(id => { clearTimeout(id); clearInterval(id); }); t.ids.clear(); return t.run; },
    start(name) { return api.stop(name); },
    run: name => tr(name).run,
    alive: (name, run) => tr(name).run === run,
    after(name, ms, fn) { const t = tr(name), run = t.run; const id = setTimeout(() => { t.ids.delete(id); if (t.run === run) fn(); }, ms); t.ids.add(id); return id; },
    every(name, ms, fn) { const t = tr(name), run = t.run; const id = setInterval(() => { if (t.run === run) fn(); }, ms); t.ids.add(id); return id; },
  };
  return api;
})();

// ------------------------------------------------------------------ haptics (iOS-like)
// Max, Nov 24 (every design): light taps under the finger. tapFeel(kind):
//   "toggle" a setting switched (afterChange)   "tick" a slider moved a step
//   "snap"   a dragged tab or card took a new place   "lock" a locked setting was tried
//   "lift"   a hold picked up a tab or card to move
// In the app they are the phone's own system haptics (MorpheApp.haptic: crisp, and they follow the
// phone's touch-feedback setting); an older app or a browser gets a short vibration instead. Only in
// answer to the finger or a key: nothing buzzes on its own (a redraw, a demo, start-up), and two taps
// closer than 30 ms are one. The haptic settings' demos keep their own longer buzz (scenarios.js buzz).
let feelAct = 0, feelLast = 0;
["pointerdown", "pointermove", "keydown", "input"].forEach(t => addEventListener(t, e => { if (t !== "pointermove" || e.buttons) feelAct = performance.now(); }, { capture: true, passive: true }));
const HAPTIC_MS = { toggle: 10, tick: 4, snap: 6, lock: 14, lift: 12 };
function tapFeel(kind) {
  const now = performance.now();
  if (now - feelAct > 1200 || now - feelLast < 30) return;
  feelLast = now;
  try { if (window.MorpheApp && typeof MorpheApp.haptic === "function") { MorpheApp.haptic(kind); return; } } catch { /* an older app: vibrate */ }
  try { navigator.vibrate && navigator.vibrate(HAPTIC_MS[kind] || 8); } catch { /* not supported */ }
}
