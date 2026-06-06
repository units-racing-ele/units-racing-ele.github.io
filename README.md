# URT Calendar

Dashboard calendario per la gestione delle stampe 3D del team Formula SAE.

## Avvio locale

Apri `index.html` nel browser oppure usa una semplice estensione Live Server in VS Code.

## Struttura

- `index.html`: layout principale
- `styles.css`: stile visuale e responsive
- `main.js`: logica del calendario e degli eventi demo

## Supabase

Per condividere gli eventi tra telefono e PC, il sito può usare Supabase come archivio centralizzato.

1. Crea una tabella `events` nel progetto Supabase con queste colonne:

```sql
create table public.events (
	id text primary key,
	date date not null,
	time text not null,
	title text not null,
	type text not null,
	priority text not null,
	notes text not null
);
```

2. In `main.js` inserisci `Project URL` e `anon public key` del progetto.

3. Se vuoi partire subito senza complicare i permessi, puoi lasciare `RLS` disattivato finché testi il flusso.

4. Se la tabella `events` non esiste ancora, il sito continua a funzionare in locale ma non condividerà i dati tra dispositivi finché non la crei.

5. Quando la tabella esiste ed è vuota, il primo caricamento del sito inserisce automaticamente gli eventi iniziali già presenti nel calendario demo.

I valori da sostituire in `main.js` sono questi:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Con `RLS` disattivato il browser può leggere e scrivere direttamente sulla tabella. Quando vorrai rendere il sistema più sicuro, si può aggiungere l'autenticazione e le policy.

Se i valori Supabase non sono ancora compilati, il sito continua a funzionare in modalità locale con `localStorage`.
