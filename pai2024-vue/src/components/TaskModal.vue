<script>
const taskEndpoint = "/api/task";

export default {
  props: ["project"],
  emits: ["close"],
  data() {
    return {
      isDialogOpen: true,
      tasks: [],
      input: {
        name: "",
        startDate: "",
        endDate: "",
        assignee_ids: [],
      },
      rules: {
        startsWithLetter: (value) => {
          const pattern = /^\p{L}/u;
          return pattern.test(value) || "Wymagane zaczynanie się od litery";
        },
        validDate: (value) => {
          const date = new Date(value);
          return !!date || `Wymagana prawidłowa data`;
        },
      },
      persons: [],
      isEditing: false, // Track if we are editing an existing task
      selectedTaskId: null, // To identify the task being edited
    };
  },
  methods: {
    loadTasks() {
      fetch(`${taskEndpoint}?project_id=${this.project._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            this.tasks = data;
          }
        })
        .catch((err) => console.error("Error loading tasks:", err));
    },
    loadPersons() {
      fetch("/api/person")
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            const contractorsSet = new Set(this.project.contractor_ids);
            this.persons = data.data.filter((p) => contractorsSet.has(p._id));
          }
        })
        .catch((err) => console.error("Error loading persons:", err));
    },
    saveTask() {
      const method = this.isEditing ? "PUT" : "POST";
      const body = {
        name: this.input.name,
        startDate: this.input.startDate,
        endDate: this.input.endDate,
        assignee_ids: this.input.assignee_ids,
        project_id: this.project._id,
        _id: this.isEditing ? this.selectedTaskId : undefined,
      };

      fetch(taskEndpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            this.loadTasks();
            this.resetInput();
          }
        })
        .catch((err) => console.error("Error saving task:", err));
    },
    deleteTask(taskId) {
      fetch(`${taskEndpoint}?_id=${taskId}`, { method: "DELETE" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            this.loadTasks();
          }
        })
        .catch((err) => console.error("Error deleting task:", err));
    },
    editTask(task) {
      this.isEditing = true;
      this.selectedTaskId = task._id;
      this.input = {
        name: task.name,
        startDate: task.startDate,
        endDate: task.endDate,
        assignee_ids: task.assignee_ids,
      };
    },
    resetInput() {
      this.isEditing = false;
      this.selectedTaskId = null;
      this.input = {
        name: "",
        startDate: "",
        endDate: "",
        assignee_ids: [],
      };
    },
    closeModal() {
      this.$emit("close");
    },
  },
  mounted() {
    this.loadTasks();
    this.loadPersons();
  },
};
</script>

<template>
  <v-dialog v-model="isDialogOpen" persistent max-width="800px">
    <v-card>
      <v-card-title>Zarządzaj Zadaniami</v-card-title>
      <v-card-text>
        <!-- Task List -->
        <v-list>
          <v-list-item v-for="task in tasks" :key="task._id">
            <div>
              <div>{{ task.name }}</div>
              <small>
                Start:
                {{ new Date(task.startDate).toLocaleDateString() }}
                -
                {{
                  task.endDate
                    ? "End: " + new Date(task.endDate).toLocaleDateString()
                    : "in progress"
                }}
              </small>
            </div>
            <template v-slot:append>
              <v-btn icon @click="editTask(task)">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon @click="deleteTask(task._id)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

        <!-- Task Form -->
        <v-form>
          <v-text-field
            v-model="input.name"
            label="Nazwa Zadania"
            :rules="[rules.startsWithLetter]"
          ></v-text-field>
          <v-text-field
            type="date"
            v-model="input.startDate"
            label="Data Rozpoczęcia"
            :rules="[rules.validDate]"
          ></v-text-field>
          <v-text-field
            type="date"
            v-model="input.endDate"
            label="Data Zakończenia"
            :rules="[rules.validDate]"
          ></v-text-field>
          <v-autocomplete
            v-model="input.assignee_ids"
            :items="persons"
            :item-title="(item) => item.firstName + ' ' + item.lastName"
            item-value="_id"
            label="Wybierz Wykonawców"
            multiple
          ></v-autocomplete>
          <v-btn @click="saveTask" color="primary">
            {{ isEditing ? "Zaktualizuj" : "Dodaj" }} Zadanie
          </v-btn>
          <v-btn @click="resetInput">Anuluj</v-btn>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="error" @click="closeModal">Zamknij</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped></style>
