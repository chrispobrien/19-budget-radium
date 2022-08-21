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

    // if browser is online send budget items to MongoDB
    if (navigator.online) {
        // upload any items created offline
        // uploadItem();
        // Get all server transactions
        fetch("/api/transaction")
            .then(response => {
                return response.json();
            })
            .then(data => {
                // save db data on global variable
                // transactions = data;

                // sync local and server db
                syncItems(data);
                populateTotal();
                populateTable();
                populateChart();
            })
            .catch(err => {
            // load from local IndexedDb if api is not available
                console.log(err);
            });
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

function loadLocal() {
    // open a transaction on your db
    const transaction = db.transaction(['item'], 'readwrite');

    // access your object store
    const itemObjectStore = transaction.objectStore('item');

    // get all records from store and set to a variable (note async)
    const getAll = itemObjectStore.getAll();

    // upon success, set transactions to result and populate display
    getAll.onsuccess = function() {
        transactions = getAll.result;
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
            let value = cursor.value;

            // if no _id then this is a new item that needs to be sent to the server
            if (value && !value._id) {
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
                    cursor.update(postData);
                })
                .catch(err => {
                    console.log('Unable to send local items to server: offline or server unavailable');
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
                transactions = getAll.result;
                populateTotal();
                populateTable();
                populateChart();
            };
        };
    };
};


// add items from the server that don't exist in the local db
function syncItemsGetAll(data) {
    // open a transaction on your db
    const transaction = db.transaction(['item'], 'readwrite');

    // access your object store
    const itemObjectStore = transaction.objectStore('item');

    // get all records from store and set to a variable
    const getAll = itemObjectStore.getAll();

    // upon a successful .getAll() execution, run this function
    getAll.onsuccess = function() {
        // download step
        // for all api items, check if it exists in the local db, if not add it
        data.map(item => {
            // if there is no local record with the server _id, add this record from the server to local
            if (getAll.result.filter(localItem => localItem._id === item._id).length === 0) {
                itemObjectStore.add(item);
            };
        });
        // upload step
        // for all items in the local db, check if it has an _id, if not send to server
        getAll.result.filter(localItem => !localItem._id).map(item => {
            fetch('/api/transaction', {
                method: 'POST',
                body: JSON.stringify(item),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(postData => {
                console.log('Sent to server: ',postData);
            })
            .catch(err => {
                console.log('Unable to sync: offline or server unavailable');
            })
        });

        const clearLocal = itemObjectStore.clear();

        clearLocal.onsuccess = function() {
        
        }
    }

}

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
            // new items in the local db don't contain the MongoDB _id
            let getNew = getAll.result.filter(item => !item._id);
            // for each new item, post to MongoDB
            getNew.result.map(item => {
                fetch('/api/transaction', {
                    method: 'POST',
                    body: JSON.stringify(item),
                    headers: {
                        Accept: 'application/json, text/plain, */*',
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        throw new Error(data);
                    }
                    // open one more transaction
                    const transaction = db.transaction(['item'], 'readwrite');
                    // access the local item object store
                    const itemObjectStore = transaction.objectStore('item');
                    // update the item in the store
                    // itemObjectStore.clear();
                    console.log(item);
                    console.log(data);
    
                    // console.log('All saved budget items have been submitted!');
                })
                .catch(err => {
                    console.log(err);
                });            
            })
            
        };
    };
};

// listen for app to come back online
window.addEventListener('online', uploadItem);