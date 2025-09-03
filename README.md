# CoWorkSpace 
Si tratta di una piattaforma per la prenotazione di sale riunioni, uffici e spazi eventi.

# Team:
757608 --> Babini Ariele<br>
758017 --> Bottaro Federico

## 📜 Descrizione

Questo repository contiene il codice sorgente per CoWorkSpace. L'applicazione è stata sviluppata per gestire un servizio di prenotazione uffici e spazi eventi per aziende e business di tutte le dimensioni; offre funzionalità per diverse tipologie di utenti. L'intera infrastruttura è gestita tramite container per garantire coerenza e facilità di deployment.

---

## 🛠️ Strumenti Utilizzati

L'architettura del progetto si basa sulle seguenti tecnologie:

* **Containerizzazione:** Docker e Docker Compose
* **Backend Runtime:** Node.js
* **Framework Backend:** Express.js
* **Database:** PostgreSQL
* **Framework Frontend:** Bootstrap 5.3.5

---

## 🚀 Accesso al Frontend e Credenziali di Test

È possibile accedere all'interfaccia utente dell'applicazione al seguente indirizzo:

**URL:** `http://indirizzo_o_dominio.html`

Per esplorare le diverse funzionalità e i livelli di accesso, è possibile utilizzare le seguenti credenziali per il login.

### Utente Standard
* **Email:** `carlo@gmai.com`
* **Password:** `Carlo123`

### Artigiano
* **Email:** `federico@manager.com`
* **Password:** `Ciao123456`

### Amministratore
* **Email:** `admin@coworkspace.it`
* **Password:** `Admin123`

---

## ⚙️ Installazione e Avvio Locale (Opzionale)

Se vuoi includere istruzioni per avviare il progetto in un ambiente di sviluppo locale, puoi aggiungere questa sezione.

1.  **Clonare il repository:**
    ```bash
    git clone [https://github.com/tuo-utente/tuo-repository.git](https://github.com/tuo-utente/tuo-repository.git)
    cd tuo-repository
    ```

2.  **Configurare le variabili d'ambiente:**
    Configurare il file `.env` a dovere modificando le variabili necessarie (es. credenziali del database, chiavi segrete, porte, etc.).

3.  **Avviare i container con Docker Compose:**
    Assicurarsi di avere Docker in esecuzione e lanciare il seguente comando dalla root del progetto.
    ```bash
    docker-compose up -d --build
    ```

4.  L'applicazione lato client sarà ora accessibile all'indirizzo `http://localhost:PORTA` (specificare la porta corretta).

N.B. 

    Il server gira su una porta diversa rispetto al lato client, si ricorda che è necessario specificare la porta corretta per poter comunicare correttamente con il lato server.

