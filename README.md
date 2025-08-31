# CoWorkSpace Backend API
Sistema completo di gestione spazi di coworking con autenticazione, prenotazioni, pagamenti Stripe e dashboard analytics.

# Team:
757608 --> Babini Ariele<br>
758017 --> Bottaro Federico

Strumenti:
- PostgreSQL

# Schema del Database CoWorkSpace

Questo documento fornisce una panoramica completa dello schema del database per il sistema CoWorkSpace. Il database è progettato per gestire utenti, spazi di lavoro, prenotazioni, recensioni, pagamenti e notifiche.

## Indice
- [Tipi di Dati Enumerati (ENUM)](#tipi-di-dati-enumerati-enum)
- [Tabelle del Database](#tabelle-del-database)
  - [`users`](#users)
  - [`spaces`](#spaces)
  - [`bookings`](#bookings)
  - [`reviews`](#reviews)
  - [`payments`](#payments)
  - [`space_availability`](#space_availability)
  - [`notifications`](#notifications)
  - [`audit_logs`](#audit_logs)
- [Relazioni tra le Tabelle](#relazioni-tra-le-tabelle)
- [Funzioni e Trigger](#funzioni-e-trigger)
- [Indici](#indici)

---

## Tipi di Dati Enumerati (ENUM)

Il database utilizza diversi tipi di dati personalizzati (ENUM) per garantire la coerenza dei valori in determinate colonne.

* **`user_role`**: Definisce i ruoli possibili per un utente.
    * `client`: Un cliente standard che prenota spazi.
    * `manager`: Un gestore responsabile di uno o più spazi.
    * `admin`: Un amministratore con accesso completo al sistema.

* **`account_status`**: Rappresenta lo stato dell'account di un utente.
    * `active`: L'account è attivo.
    * `inactive`: L'account è stato disattivato.
    * `suspended`: L'account è stato sospeso.

* **`space_type`**: Categorizza i tipi di spazi disponibili.
    * `hot-desk`: Scrivania in un'area condivisa.
    * `private-office`: Ufficio privato.
    * `meeting-room`: Sala riunioni.
    * `event-space`: Spazio per eventi.

* **`booking_status`**: Indica lo stato di una prenotazione.
    * `pending`: La prenotazione è in attesa di conferma.
    * `confirmed`: La prenotazione è stata confermata.
    * `cancelled`: La prenotazione è stata annullata.
    * `completed`: La prenotazione è conclusa.

* **`payment_status`**: Traccia lo stato di un pagamento.
    * `pending`: Il pagamento è in sospeso.
    * `completed`: Il pagamento è stato completato con successo.
    * `failed`: Il pagamento è fallito.
    * `refunded`: Il pagamento è stato rimborsato.

---

## Tabelle del Database

Di seguito è riportata una descrizione dettagliata di ciascuna tabella.

### `users`
Contiene le informazioni anagrafiche e di autenticazione per tutti gli utenti del sistema.

| Colonna | Tipo Dati | Descrizione |
| --- | --- | --- |
| `id` | `uuid` | Chiave primaria univoca. |
| `email` | `varchar(255)` | Indirizzo email univoco dell'utente. |
| `password_hash` | `varchar(255)` | Hash della password per la sicurezza. |
| `first_name` | `varchar(100)` | Nome dell'utente. |
| `last_name` | `varchar(100)` | Cognome dell'utente. |
| `phone` | `varchar(20)` | Numero di telefono (opzionale). |
| `company` | `varchar(255)` | Azienda di appartenenza (opzionale). |
| `role` | `user_role` | Ruolo dell'utente (default: 'client'). |
| `status` | `account_status` | Stato dell'account (default: 'active'). |
| `email_verified` | `boolean` | Flag che indica se l'email è stata verificata. |
| `profile_image` | `varchar(500)` | URL dell'immagine del profilo. |
| `created_at` | `timestamptz` | Data e ora di creazione. |
| `updated_at` | `timestamptz` | Data e ora dell'ultimo aggiornamento. |
| `last_login` | `timestamptz` | Data e ora dell'ultimo accesso. |

### `spaces`
Memorizza le informazioni relative agli spazi di coworking disponibili per la prenotazione.

| Colonna | Tipo Dati | Descrizione |
| --- | --- | --- |
| `id` | `uuid` | Chiave primaria univoca. |
| `name` | `varchar(255)` | Nome dello spazio. |
| `description` | `text` | Descrizione dettagliata dello spazio. |
| `type` | `space_type` | Tipologia di spazio (es. 'hot-desk'). |
| `city` | `varchar(100)` | Città in cui si trova lo spazio. |
| `address` | `text` | Indirizzo completo. |
| `capacity` | `integer` | Numero massimo di persone che può ospitare. |
| `price_per_day` | `numeric(10,2)` | Prezzo base giornaliero. |
| `manager_id` | `uuid` | FK che fa riferimento all'utente (`users.id`) che gestisce lo spazio. |
| `amenities` | `jsonb` | Un array JSON di servizi offerti (es. ['wifi', 'coffee']). |
| `images` | `jsonb` | Un array JSON di URL delle immagini dello spazio. |
| `rating` | `numeric(3,2)` | Valutazione media basata sulle recensioni (da 0 a 5). |
| `total_reviews` | `integer` | Numero totale di recensioni ricevute. |
| `is_active` | `boolean` | Indica se lo spazio è attualmente disponibile per la prenotazione. |

### `bookings`
Contiene i dettagli di tutte le prenotazioni effettuate dagli utenti.

| Colonna | Tipo Dati | Descrizione |
| --- | --- | --- |
| `id` | `uuid` | Chiave primaria univoca. |
| `user_id` | `uuid` | FK che fa riferimento all'utente (`users.id`) che ha effettuato la prenotazione. |
| `space_id` | `uuid` | FK che fa riferimento allo spazio (`spaces.id`) prenotato. |
| `start_date` | `date` | Data di inizio della prenotazione. |
| `end_date` | `date` | Data di fine della prenotazione. |
| `total_price` | `numeric(10,2)` | Costo totale della prenotazione. |
| `status` | `booking_status` | Stato attuale della prenotazione (default: 'pending'). |
| `people_count` | `integer` | Numero di persone per quello spazio |
| `total_days` | `integer` | Numero di giornic he è prenotato |
| `noted` | `text` | Piccola nota per la prenotazione |
| `fees` | `numeric(10,2)` | Numero tasse da pagare |

### `payments`
Registra le transazioni finanziarie associate alle prenotazioni.

| Colonna | Tipo Dati | Descrizione |
| --- | --- | --- |
| `id` | `uuid` | Chiave primaria univoca. |
| `booking_id` | `uuid` | FK che fa riferimento alla prenotazione (`bookings.id`) associata al pagamento. |
| `stripe_payment_intent_id`| `varchar(255)`| ID univoco della transazione generato da Stripe. |
| `amount` | `numeric(10,2)` | Importo del pagamento. |
| `currency` | `varchar(3)` | Valuta del pagamento (default: 'EUR'). |
| `status` | `payment_status` | Stato del pagamento (default: 'pending'). |
| `payment_method` | `jsonb` | Tipo di pagamento |

### `space_availability`
Gestisce la disponibilità specifica (date e orari) per ogni spazio, permettendo eccezioni o prezzi personalizzati.

| Colonna | Tipo Dati | Descrizione |
| --- | --- | --- |
| `id` | `uuid` | Chiave primaria univoca. |
| `space_id` | `uuid` | FK che fa riferimento allo spazio (`spaces.id`). |
| `date` | `date` | Data specifica di disponibilità. |
| `start_time` | `time` | Ora di inizio della disponibilità. |
| `end_time` | `time` | Ora di fine della disponibilità. |
| `is_available`| `boolean` | Indica se lo spazio è disponibile in quella fascia oraria. |
| `price_override`| `numeric(10,2)`| Prezzo speciale per quella fascia oraria, che sovrascrive quello di default. |

### `notifications`
Tabella per la gestione delle notifiche inviate agli utenti (es. conferma prenotazione, promemoria).

| Colonna | Tipo Dati | Descrizione |
| --- | --- | --- |
| `id` | `uuid` | Chiave primaria univoca. |
| `user_id` | `uuid` | FK che fa riferimento all'utente (`users.id`) destinatario. |
| `type` | `varchar(50)` | Tipo di notifica (es. 'BOOKING_CONFIRMED'). |
| `title` | `varchar(255)` | Titolo della notifica. |
| `message` | `text` | Contenuto del messaggio. |
| `is_read` | `boolean` | Flag per indicare se la notifica è stata letta. |
| `data` | `date` | Data notifica |

---

## Relazioni tra le Tabelle

Le tabelle sono collegate tramite chiavi esterne (`FOREIGN KEY`) per mantenere l'integrità referenziale.

* Un `user` (con ruolo 'manager') può gestire più `spaces`. (`spaces.manager_id` -> `users.id`)
* Un `user` può effettuare più `bookings`. (`bookings.user_id` -> `users.id`)
* Uno `space` può essere oggetto di più `bookings`. (`bookings.space_id` -> `spaces.id`)
* Una `booking` ha uno o più `payments`. (`payments.booking_id` -> `bookings.id`)
* Uno `space` può avere più voci di `space_availability`. (`space_availability.space_id` -> `spaces.id`)
* Un `user` può ricevere più `notifications`. (`notifications.user_id` -> `users.id`)

Tutte le relazioni principali utilizzano la policy `ON DELETE CASCADE`, il che significa che se un record genitore viene eliminato (es. un utente o uno spazio), tutti i record figli correlati (es. prenotazioni, recensioni) verranno eliminati automaticamente.

---

## Funzioni e Trigger

Il database utilizza funzioni e trigger per automatizzare alcune operazioni.

* **`update_updated_at_column()`**: Una funzione generica che aggiorna automaticamente il campo `updated_at` di una tabella ogni volta che un record viene modificato.
    * **Trigger associati**: `update_users_updated_at`, `update_spaces_updated_at`, `update_bookings_updated_at`, `update_reviews_updated_at`, `update_payments_updated_at`.

* **`update_space_rating()`**: Una funzione che viene eseguita dopo ogni inserimento, modifica o cancellazione nella tabella `reviews`.
    * **Trigger associato**: `update_space_rating_trigger`.
    * **Scopo**: Ricalcola la valutazione media (`rating`) e il numero totale di recensioni (`total_reviews`) per lo spazio corrispondente nella tabella `spaces`, garantendo che i dati siano sempre aggiornati.

---

## Indici

Sono stati creati numerosi indici per ottimizzare le prestazioni delle query, in particolare per le operazioni di ricerca e filtro.

* **Tabelle `users`, `spaces`, `bookings`**: Indici sulle chiavi esterne (`user_id`, `space_id`, `manager_id`), sullo stato (`status`, `role`) e su campi di uso comune come `email` e `city`.
* **Tabella `bookings`**: Un indice univoco (`idx_bookings_no_overlap`) impedisce la creazione di prenotazioni sovrapposte (con stato 'pending' or 'confirmed') per lo stesso spazio e intervallo di tempo.
* **Tabelle `reviews`, `payments`, `notifications`**: Indici sulle chiavi esterne e sui campi utilizzati per i filtri, come `rating` e `status`.
* **Tabella `audit_logs`**: Indici sulla coppia (`table_name`, `record_id`) e su `user_id` per accelerare la ricerca dei log.
