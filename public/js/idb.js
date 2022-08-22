let db;
const request = indexedDB.open('budget_radium', 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
//  OR upon first connection will create the version 1 object store
request.onupgradeneeded = function(event) {
    // save a reference to the database
    const db = event.target.result;
    // create an object store (table) called 'new_item', set it to have an auto incrementing primary key of sorts
    db.createObjectStore('item', {autoIncrement: true} );
};

// upon a successful
request.onsuccess = function(event) {
    // when db is successfully created with its object store (from onupgradeneeded event above) or simply established a connection, save reference to db in global variable
    db = event.target.result;

    // if browser is online fetch server transactions and sync local db
    if (navigator.online) {
        // Get all server transactions
        fetch("/api/transaction")
            .then(response => {
                return response.json();
            })
            .then(data => {
                // sync local and server db
                syncItems(data);
            })
            .catch(err => {
                console.log(err);
            });
    } else {
        // if browser is offline, load from IndexedDB
        loadLocal();
    }
};

// log errors to console
request.onerror = function(event) {
    console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new item and there's no internet connection
function saveRecord(record) {
    // open a new transaction with the database with read and write permissions 
    const transaction = db.transaction(['item'], 'readwrite');

    // access IndexedDB local object store
    const itemObjectStore = transaction.objectStore('item');

    // add record to IndexedDB local object store with add method
    itemObjectStore.add(record);
};

// load transactions from IndexedDB
function loadLocal() {
    // open a transaction on your db
    const transaction = db.transaction(['item'], 'readwrite');

    // access your object store
    const itemObjectStore = transaction.objectStore('item');

    // get all records from store and set to a variable (note async)
    const getAll = itemObjectStore.getAll();

    // upon success, set transactions to result and populate display
    getAll.onsuccess = function() {
        transactions = getAll.result.reverse();
        populateTotal();
        populateTable();
        populateChart();
    }
};

// sync local db to server
function syncItems(data) {
    // open a transaction on your db
    const transaction = db.transaction(['item'], 'readwrite');

    // access your object store
    const itemObjectStore = transaction.objectStore('item');

    // iterate through all local records with a cursor so we can add _id to local object
    const request = itemObjectStore.openCursor();

    request.onerror = function(event) {
        console.log('error fetching data: ', event)
    };

    request.onsuccess = function(event) {
        let cursor = event.target.result;
        if (cursor) {
            let key = cursor.key;
            let value = cursor.value;

            // if no _id then this is a new item that needs to be sent to the server
            if (!value._id) {
                fetch('/api/transaction', {
                    method: 'POST',
                    body: JSON.stringify(value),
                    headers: {
                        Accept: 'application/json, text/plain, */*',
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(postData => {
                    console.log('Sent to server: ',postData);
                    // update local record with _id value
                    // since this is async we have to create a new transaction
                    const t = db.transaction(['item'], 'readwrite');
                    const i = t.objectStore('item');
                    i.put(postData, key);
                })
                .catch(err => {
                    console.log('Unable to send local items to server: offline or server unavailable');
                    console.log(err);
                })
            }
            cursor.continue();
        } else {
            // when done sending items to server, getAll local records
            const getAll = itemObjectStore.getAll();

            getAll.onerror = function(event) {
                console.log('error fetching data: ', event);
            };
        
            getAll.onsuccess = function(event) {
                // if there are new items on server, not in local db, add them
                data.map(item => {
                    // if there is no local record with the server _id, add this record from the server to local
                    if (getAll.result.filter(localItem => localItem._id === item._id).length === 0) {
                        itemObjectStore.add(item);
                    };
                });

                transactions = getAll.result.reverse();
                populateTotal();
                populateTable();
                populateChart();
            };
        };

        itemObjectStore.oncomplete = function(event) {
            const getAll = itemObjectStore.getAll();

            getAll.onerror = function(event) {
                console.log('error fetching data: ', event);
            };
        
            getAll.onsuccess = function(event) {
                // if there are new items on server, not in local db, add them
                data.map(item => {
                    // if there is no local record with the server _id, add this record from the server to local
                    if (getAll.result.filter(localItem => localItem._id === item._id).length === 0) {
                        itemObjectStore.add(item);
                    };
                });

                transactions = getAll.result.reverse();
                populateTotal();
                populateTable();
                populateChart();
            };            
        }
    };
};

// clone server items - send local IndexedDb items to server and vice versa
function uploadItem() {
    fetch("/api/transaction")
    .then(response => {
        return response.json();
    })
    .then(data => {
        // sync local and server db
        syncItems(data);
        // populateTotal();
        // populateTable();
        // populateChart();
    })
    .catch(err => {
        console.log(err);
    });
};

// listen for app to come back online
window.addEventListener('online', uploadItem);