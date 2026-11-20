
from flask import Flask, render_template, request, jsonify, Response
import sqlite3
import os
import re
import csv
import io

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "database", "expenses.db")


def get_db_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def create_tables():
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)

    connection = get_db_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL
        )
    """)

    connection.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month TEXT UNIQUE NOT NULL,
            amount REAL NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def valid_date(date):
    return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", date))


# Dashboard
@app.route("/")
def home():
    return render_template("index.html")


# Get expenses, with optional search and filters
@app.route("/api/expenses", methods=["GET"])
def get_expenses():

    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    query = "SELECT * FROM expenses WHERE 1=1"
    parameters = []

    if search:
        query += " AND name LIKE ?"
        parameters.append(f"%{search}%")

    if category:
        query += " AND category = ?"
        parameters.append(category)

    if start_date:
        if not valid_date(start_date):
            return jsonify({"error": "Invalid start date"}), 400
        query += " AND date >= ?"
        parameters.append(start_date)

    if end_date:
        if not valid_date(end_date):
            return jsonify({"error": "Invalid end date"}), 400
        query += " AND date <= ?"
        parameters.append(end_date)

    if start_date and end_date and start_date > end_date:
        return jsonify({"error": "Start date cannot be after end date"}), 400

    query += " ORDER BY date DESC, id DESC"

    connection = get_db_connection()
    expenses = connection.execute(query, parameters).fetchall()
    connection.close()

    return jsonify([dict(expense) for expense in expenses])


# Add expense
@app.route("/api/expenses", methods=["POST"])
def add_expense():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid data"}), 400

    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "")).strip()
    date = str(data.get("date", "")).strip()

    try:
        amount = float(data.get("amount"))
    except (ValueError, TypeError):
        return jsonify({"error": "Enter a valid amount"}), 400

    if not name or not category or not valid_date(date) or amount <= 0:
        return jsonify({"error": "Please enter valid expense details"}), 400

    connection = get_db_connection()

    cursor = connection.execute(
        """INSERT INTO expenses (name, amount, category, date)
           VALUES (?, ?, ?, ?)""",
        (name, amount, category, date)
    )

    connection.commit()
    expense_id = cursor.lastrowid
    connection.close()

    return jsonify({
        "message": "Expense added successfully",
        "id": expense_id
    }), 201


# Update expense
@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def update_expense(expense_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid data"}), 400

    name = str(data.get("name", "")).strip()
    category = str(data.get("category", "")).strip()
    date = str(data.get("date", "")).strip()

    try:
        amount = float(data.get("amount"))
    except (ValueError, TypeError):
        return jsonify({"error": "Enter a valid amount"}), 400

    if not name or not category or not valid_date(date) or amount <= 0:
        return jsonify({"error": "Please enter valid expense details"}), 400

    connection = get_db_connection()

    cursor = connection.execute(
        """UPDATE expenses
           SET name = ?, amount = ?, category = ?, date = ?
           WHERE id = ?""",
        (name, amount, category, date, expense_id)
    )

    connection.commit()
    updated = cursor.rowcount
    connection.close()

    if updated == 0:
        return jsonify({"error": "Expense not found"}), 404

    return jsonify({"message": "Expense updated successfully"})


# Delete expense
@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):

    connection = get_db_connection()

    cursor = connection.execute(
        "DELETE FROM expenses WHERE id = ?",
        (expense_id,)
    )

    connection.commit()
    deleted = cursor.rowcount
    connection.close()

    if deleted == 0:
        return jsonify({"error": "Expense not found"}), 404

    return jsonify({"message": "Expense deleted successfully"})


# Get monthly budget
@app.route("/api/budget/<month>", methods=["GET"])
def get_budget(month):

    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
        return jsonify({"error": "Invalid month"}), 400

    connection = get_db_connection()

    budget = connection.execute(
        "SELECT amount FROM budgets WHERE month = ?",
        (month,)
    ).fetchone()

    connection.close()

    return jsonify({
        "month": month,
        "amount": budget["amount"] if budget else 0
    })


# Save monthly budget
@app.route("/api/budget", methods=["POST"])
def save_budget():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Invalid data"}), 400

    month = str(data.get("month", "")).strip()

    try:
        amount = float(data.get("amount"))
    except (ValueError, TypeError):
        return jsonify({"error": "Enter a valid budget"}), 400

    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
        return jsonify({"error": "Invalid month"}), 400

    if amount <= 0:
        return jsonify({"error": "Budget must be greater than zero"}), 400

    connection = get_db_connection()

    connection.execute(
        """INSERT INTO budgets (month, amount)
           VALUES (?, ?)
           ON CONFLICT(month)
           DO UPDATE SET amount = excluded.amount""",
        (month, amount)
    )

    connection.commit()
    connection.close()

    return jsonify({"message": "Monthly budget saved successfully"})


# Export filtered expenses to CSV
@app.route("/api/expenses/export", methods=["GET"])
def export_expenses():

    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    query = "SELECT name, amount, category, date FROM expenses WHERE 1=1"
    parameters = []

    if search:
        query += " AND name LIKE ?"
        parameters.append(f"%{search}%")

    if category:
        query += " AND category = ?"
        parameters.append(category)

    if start_date:
        if not valid_date(start_date):
            return jsonify({"error": "Invalid start date"}), 400
        query += " AND date >= ?"
        parameters.append(start_date)

    if end_date:
        if not valid_date(end_date):
            return jsonify({"error": "Invalid end date"}), 400
        query += " AND date <= ?"
        parameters.append(end_date)

    if start_date and end_date and start_date > end_date:
        return jsonify({"error": "Start date cannot be after end date"}), 400

    query += " ORDER BY date DESC"

    connection = get_db_connection()
    expenses = connection.execute(query, parameters).fetchall()
    connection.close()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Expense Name", "Amount (INR)", "Category", "Date"])

    for expense in expenses:
        writer.writerow([
            expense["name"],
            expense["amount"],
            expense["category"],
            expense["date"]
        ])

    response = Response(
        "\ufeff" + output.getvalue(),
        mimetype="text/csv"
    )

    response.headers["Content-Disposition"] = (
        "attachment; filename=spendwise_expenses.csv"
    )

    return response


if __name__ == "__main__":
    create_tables()
    app.run(debug=True)
