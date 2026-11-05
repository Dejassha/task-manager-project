from contextlib import closing

from flask import Flask, jsonify, request
from flask_cors import CORS

from database import get_connection, init_db

app = Flask(__name__)
CORS(app)

init_db()

TASK_COLUMNS = "id, title, completed, priority, due_date"


def serialize_task(row):
    task = dict(row)
    task["completed"] = bool(task["completed"])
    return task


def find_task(task_id):
    with closing(get_connection()) as conn:
        row = conn.execute(
            f"SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
    return serialize_task(row) if row else None


@app.route("/")
def home():
    return jsonify({
        "message": "Task Manager Backend is running!"
    })


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    with closing(get_connection()) as conn:
        rows = conn.execute(
            f"SELECT {TASK_COLUMNS} FROM tasks ORDER BY id DESC"
        ).fetchall()
    return jsonify([serialize_task(row) for row in rows])


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json(silent=True) or {}

    if not data.get("title") or not str(data["title"]).strip():
        return jsonify({"error": "Task title is required"}), 400

    priority = str(data.get("priority", "Medium")).capitalize()
    if priority not in ("High", "Medium", "Low"):
        priority = "Medium"

    with closing(get_connection()) as conn:
        with conn:
            cursor = conn.execute(
                "INSERT INTO tasks (title, completed, priority, due_date) "
                "VALUES (?, ?, ?, ?)",
                (
                    str(data["title"]).strip(),
                    int(bool(data.get("completed", False))),
                    priority,
                    data.get("due_date") or None,
                ),
            )
            task_id = cursor.lastrowid

        row = conn.execute(
            f"SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()

    return jsonify(serialize_task(row)), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    task = find_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json(silent=True) or {}

    if "title" in data:
        if not str(data["title"]).strip():
            return jsonify({"error": "Task title cannot be empty"}), 400
        task["title"] = str(data["title"]).strip()

    if "priority" in data:
        priority = str(data["priority"]).capitalize()
        if priority not in ("High", "Medium", "Low"):
            return jsonify({"error": "Priority must be High, Medium or Low"}), 400
        task["priority"] = priority

    if "due_date" in data:
        task["due_date"] = data["due_date"] or None

    if "completed" in data:
        task["completed"] = bool(data["completed"])

    with closing(get_connection()) as conn:
        with conn:
            conn.execute(
                "UPDATE tasks SET title = ?, completed = ?, priority = ?, due_date = ? "
                "WHERE id = ?",
                (
                    task["title"],
                    int(task["completed"]),
                    task["priority"],
                    task["due_date"],
                    task_id,
                ),
            )

    return jsonify(task)


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    with closing(get_connection()) as conn:
        with conn:
            cursor = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        deleted = cursor.rowcount > 0

    if not deleted:
        return jsonify({"error": "Task not found"}), 404

    return jsonify({"message": "Task deleted"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
