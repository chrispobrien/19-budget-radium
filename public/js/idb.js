let db;
const request = indexedDb.open('budget_radium', 1);

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

    // if browser is online send budget items to MongoDB
    if (navigator.online) {
        // upload any items created offline
        uploadItem();
        // create a local copy
        downloadItem();
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

// clone server items - send local IndexedDb items to server and vice versa
function uploadItem() {
    // open a transaction on your db
    const transaction = db.transaction(['item'], 'readwrite');

    // access your object store
    const itemObjectStore = transaction.objectStore('item');

    // get all records from store and set to a variable
    const getAll = itemObjectStore.getAll();

    // upon a successful .getAll() execution, run this function
    getAll.onsuccess = function() {
        // if there was data in indexedDb's store, let's send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(serverResponse => {
                if (serverResponse.message) {
                    throw new Error(serverResponse);
                }
                // open one more transaction
                const transaction = db.transaction(['item'], 'readwrite');
                // access the local item object store
                const itemObjectStore = transaction.objectStore('item');
                // clear all items in your store
                itemObjectStore.clear();

                console.log('All saved budget items have been submitted!');
            })
            .catch(err => {
                console.log(err);
            });
        };
    };
};

// listen for app to come back online
window.addEventListener('online', uploadItem);