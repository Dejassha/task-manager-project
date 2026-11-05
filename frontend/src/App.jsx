import { useEffect, useMemo, useState } from "react";
import "./App.css";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/tasks";

  async function fetchTasks() {
    try {
      const response = await fetch(API_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
      setError("");
      return true;
    } catch {
      setError("Cannot load tasks. Make sure the backend is running on port 5000.");
      return false;
    }
  }

  async function addTask(event) {
    event.preventDefault();
    if (!title.trim()) return;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          due_date: dueDate || null,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setTitle("");
      setPriority("Medium");
      setDueDate("");
      await fetchTasks();
    } catch {
      setError("Task was not saved. Make sure the backend is running on port 5000.");
    }
  }

  async function toggleComplete(task) {
    try {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fetchTasks();
    } catch {
      setError("Could not update the task. Check the backend connection.");
    }
  }

  async function deleteTask(id) {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await fetchTasks();
    } catch {
      setError("Could not delete the task. Check the backend connection.");
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority || "Medium");
    setEditDueDate(task.due_date || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditPriority("Medium");
    setEditDueDate("");
  }

  async function saveEdit(id) {
    if (!editTitle.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          priority: editPriority,
          due_date: editDueDate || null,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      cancelEdit();
      await fetchTasks();
    } catch {
      setError("Could not save changes. Check the backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    let retryTimer;

    async function load() {
      const ok = await fetchTasks();
      if (active && !ok) {
        retryTimer = setTimeout(load, 3000);
      }
    }

    load();

    return () => {
      active = false;
      clearTimeout(retryTimer);
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (t) => !t.completed && t.due_date && t.due_date < today;

  const stats = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      pending: tasks.filter((t) => !t.completed).length,
      overdue: tasks.filter(isOverdue).length,
    }),
    [tasks]
  );

  const visibleTasks = tasks.filter((t) => {
    if (filter === "Pending" && t.completed) return false;
    if (filter === "Completed" && !t.completed) return false;
    if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="app">
      {/* Dark Sidebar */}
      <aside className="sidebar">
        <div className="logo">Task Manager</div>
        <nav>
          {["Dashboard", "My Tasks"].map((item) => (
            <button
              key={item}
              className={activeNav === item ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">{stats.pending} pending tasks</div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <h1>{activeNav}</h1>
          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task name..."
          />
        </header>

        {/* Analytics Cards */}
            {error && <p className="alert">{error}</p>}

            {activeNav === "Dashboard" && (
              <section className="stats">
                <div className="stat">
                  <span>Total Tasks</span>
                  <strong>{stats.total}</strong>
                </div>
                <div className="stat green">
                  <span>Completed</span>
                  <strong>{stats.completed}</strong>
                </div>
                <div className="stat yellow">
                  <span>Pending</span>
                  <strong>{stats.pending}</strong>
                </div>
                <div className="stat red">
                  <span>Overdue</span>
                  <strong>{stats.overdue}</strong>
                </div>
              </section>
            )}

            {/* Add Task */}
            <section className="card">
              <form onSubmit={addTask} className="task-form">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a task"
                />
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <button type="submit">Add Task</button>
              </form>
            </section>

            {/* Filters */}
            <div className="filters">
              {["All", "Pending", "Completed"].map((f) => (
                <button
                  key={f}
                  className={filter === f ? "chip active" : "chip"}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Task list */}
            <section className="card">
              <h2>My Tasks ({visibleTasks.length})</h2>
              {visibleTasks.length === 0 ? (
                <p className="empty">No tasks found.</p>
              ) : (
                <ul className="task-list">
                  {visibleTasks.map((task) => (
                    <li key={task.id} className={task.completed ? "done" : ""}>
                      {editingId === task.id ? (
                        <div className="edit-form">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                          >
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                          </select>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                          />
                          <button onClick={() => saveEdit(task.id)} disabled={loading}>
                            Save
                          </button>
                          <button className="ghost" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="checkbox"
                            checked={!!task.completed}
                            onChange={() => toggleComplete(task)}
                          />
                          <div className="task-info">
                            <span className="task-title">{task.title}</span>
                            <div className="meta">
                              <span className={`priority ${String(task.priority || "Medium").toLowerCase()}`}>
                                {task.priority || "Medium"}
                              </span>
                              {task.due_date && (
                                <span className={isOverdue(task) ? "due overdue" : "due"}>
                                  Due: {task.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="ghost" onClick={() => startEdit(task)}>
                            Edit
                          </button>
                          <button className="danger" onClick={() => deleteTask(task.id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
      </main>
    </div>
  );
}

export default App;
