
# SpendWise – Personal Expense Tracker

SpendWise is a web-based Personal Expense Tracker that helps users record, manage, filter, and analyze their daily expenses.

The application provides an interactive dashboard with expense summaries, category-wise charts, monthly spending analysis, and budget tracking.

## Features

- Add new expenses
- View all recorded expenses
- Edit existing expenses
- Delete expenses
- Search expenses by name
- Filter expenses by category and date
- View total and monthly expenses
- Track monthly budgets
- Visualize spending using charts
- Export filtered expenses to CSV
- Store expense records permanently using SQLite

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML | Web page structure |
| CSS | Styling and responsive design |
| JavaScript | Frontend functionality |
| Python | Backend programming |
| Flask | Web framework and API |
| SQLite | Database |
| Chart.js | Expense visualizations |

## Project Architecture

User
  ↓
Frontend (HTML, CSS, JavaScript)
  ↓
Flask Backend (Python REST APIs)
  ↓
SQLite Database

JavaScript communicates with the Flask backend using HTTP requests.
Flask processes the requests and stores or retrieves expense records from SQLite.
Chart.js displays spending information through charts.

## Project Structure

PersonalExpenseTracker/
│
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── database/
│   └── expenses.db
│
├── templates/
│   └── index.html
│
└── static/
    ├── style.css
    └── script.js

## How to Run the Project

### 1. Clone the repository

git clone YOUR_GITHUB_REPOSITORY_URL

### 2. Open the project folder

cd PersonalExpenseTracker

### 3. Create a virtual environment

python -m venv venv

### 4. Activate the virtual environment

Windows:

venv\Scripts\activate

### 5. Install dependencies

pip install -r requirements.txt

### 6. Run the application

python app.py

### 7. Open in your browser

http://127.0.0.1:5000

## Database

SpendWise uses SQLite to store expense information.

The database is created automatically when the Flask application starts.

Each expense contains:
- Expense ID
- Expense name
- Amount
- Category
- Date

## Future Enhancements

- User authentication
- Downloadable PDF reports
- Advanced spending insights
- Cloud database integration
- Mobile-friendly improvements

## Author

Developed as a personal project to practice frontend development, backend APIs, database integration, and data visualization.
