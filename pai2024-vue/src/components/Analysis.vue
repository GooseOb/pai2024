<script>
const projectEndpoint = "/api/project";
const taskEndpoint = "/api/task";

const today = new Date();
const todayDate = today.toISOString().substring(0, 10);

const toISOStringDate = (dateNum) =>
  new Date(dateNum).toISOString().substring(0, 10);

const findDate = (arr, getProp, compare) => {
  if (!arr.length) return todayDate;
  const parsed = arr.map(getProp).map(Date.parse);
  return toISOStringDate(
    parsed.reduce((acc, item) => compare(acc, item), parsed[0]),
  );
};

const getStandardGanttData = (entities) => ({
  start: findDate(entities, (entity) => entity.startDate, Math.min) + " 00:00",
  end: findDate(entities, (entity) => entity.endDate, Math.max) + " 23:59",
  entities: entities.map((entity) => ({
    label: entity.name,
    bars: [
      {
        begin: entity.startDate + " 00:00",
        end: entity.endDate + " 23:59",
        ganttBarConfig: {
          id: entity._id,
          label: entity.name,
          style: {
            background: entity.endDate < today ? "#e09b69" : "#4caf50",
            borderRadius: "5px",
            color: "white",
          },
        },
      },
    ],
  })),
});

export default {
  data() {
    return {
      projects: [],
      tasks: [],
      selectedProjectId: "",
      projectGanttData: [],
      taskGanttData: [],
    };
  },
  methods: {
    loadProjects() {
      fetch(projectEndpoint)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            this.projects = data.data;
            this.prepareProjectGanttData();
          }
        })
        .catch((err) => console.error("Error loading projects:", err));
    },
    loadTasksForProject() {
      if (this.selectedProjectId) {
        fetch(`${taskEndpoint}?project_id=${this.selectedProjectId}`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.error) {
              this.tasks = data;
              this.prepareTaskGanttData();
            }
          })
          .catch((err) => console.error("Error loading tasks:", err));
      }
    },
    prepareProjectGanttData() {
      this.projectGanttData = getStandardGanttData(this.projects);
    },
    prepareTaskGanttData() {
      this.taskGanttData = getStandardGanttData(this.tasks);
    },
  },
  watch: {
    selectedProjectId: "loadTasksForProject",
  },
  mounted() {
    this.loadProjects();
  },
};
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h3>Diagram Gantta - Projekty</h3>
        <g-gantt-chart
          :chart-start="projectGanttData.start"
          :chart-end="projectGanttData.end"
          bar-start="begin"
          bar-end="end"
          precision="day"
        >
          <g-gantt-row
            v-for="project in projectGanttData.entities"
            :key="project._id"
            :label="project.label"
            :bars="project.bars"
          />
        </g-gantt-chart>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-select
          v-model="selectedProjectId"
          :items="projects"
          :item-title="(item) => item.name"
          item-value="_id"
          label="Wybierz projekt"
        ></v-select>
      </v-col>
    </v-row>

    <v-row v-if="selectedProjectId">
      <v-col cols="12">
        <h3>Diagram Gantta - Zadania w projekcie</h3>
        <g-gantt-chart
          :chart-start="taskGanttData.start"
          :chart-end="taskGanttData.end"
          bar-start="begin"
          bar-end="end"
          precision="day"
        >
          <g-gantt-row
            v-for="task in taskGanttData.entities"
            :key="task._id"
            :label="task.label"
            :bars="task.bars"
          />
        </g-gantt-chart>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
h3 {
  margin-top: 20px;
  text-align: center;
}
</style>
