const router = require("express").Router();
const Transaction = require("../models/transaction.js");

router.post("/api/transaction", ({body}, res) => {
  Transaction.create(body)
    .then(dbTransaction => {
      res.json(dbTransaction);
    })
    .catch(err => {
      res.status(404).json(err);
    });
});

router.post("/api/transaction/bulk", ({body}, res) => {
  Transaction.insertMany(body)
    .then(dbTransaction => {
      res.json(dbTransaction);
    })
    .catch(err => {
      res.status(404).json(err);
    });
});

router.get("/api/transaction", (req, res) => {
  Transaction.find({}).sort({date: 1})
    .then(dbTransaction => {
      res.json(dbTransaction);
    })
    .catch(err => {
      res.status(404).json(err);
    });
});

// Added this to delete transactions from the server

// delete all
router.delete("/api/transaction", (req, res) => {
  Transaction.deleteMany()
  .then(dbTransaction => {
    res.status(200).json({ message: 'Deleted all transactions' });
  })
  .catch(err => {
    res.status(500).json(err);
  });
});

// delete one by id
router.delete("/api/transaction/:id", (req, res) => {
  Transaction.findOneAndDelete({ _id: req.params.id })
  .then(dbTransaction => {
    res.json(dbTransaction);
  })
  .catch(err => {
    res.status(404).json(err);
  });
});

module.exports = router;