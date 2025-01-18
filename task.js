const uuid = require("uuid");
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    _id: { type: String, default: uuid.v4 },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: false },
    assignee_ids: { type: [String], required: false, default: [] },
    project_id: { type: String, required: true, ref: "project" },
  },
  {
    versionKey: false,
    additionalProperties: false,
  },
);

const task = (module.exports = {
  endpoint: "/api/task",
  model: null,

  init: (conn) => {
    task.model = conn.model("task", schema);
  },

  get: (req, res) => {
    const { project_id } = req.query;
    if (!project_id) {
      res.status(400).json({ error: "Brak identyfikatora projektu" });
      return;
    }

    task.model
      .find({ project_id })
      .then((tasks) => res.json(tasks))
      .catch((err) =>
        res.status(400).json({ error: "Nieudany odczyt z bazy", details: err }),
      );
  },

  post: (req, res) => {
    if (req.body) {
      const item = new task.model(req.body);
      const err = item.validateSync();
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      item
        .save()
        .then((itemAdded) => res.json(itemAdded))
        .catch((err) =>
          res
            .status(400)
            .json({ error: "Nie udało się dodać zadania", details: err }),
        );
    } else {
      res.status(400).json({ error: "Brak danych" });
    }
  },

  put: (req, res) => {
    if (req.body && req.body._id) {
      const _id = req.body._id;
      delete req.body._id;
      task.model
        .findOneAndUpdate(
          { _id },
          { $set: req.body },
          { new: true, runValidators: true },
        )
        .then((itemUpdated) => res.json(itemUpdated))
        .catch((err) =>
          res.status(400).json({
            error: "Nie udało się zaktualizować zadania",
            details: err,
          }),
        );
    } else {
      res.status(400).json({ error: "Brak danych do aktualizacji" });
    }
  },

  delete: (req, res) => {
    if (req.query._id) {
      task.model
        .findOneAndDelete({ _id: req.query._id })
        .then((itemDeleted) => res.json(itemDeleted))
        .catch((err) =>
          res
            .status(400)
            .json({ error: "Nie udało się usunąć zadania", details: err }),
        );
    } else {
      res.status(400).json({ error: "Brak danych do usunięcia" });
    }
  },
});
