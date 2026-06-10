import json
import os
from datetime import datetime, timedelta

DATA_FILE = "study_log.json"
DAILY_GOAL = 4  # target study hours per day during the sprint


def load_sessions():
    """Read saved study sessions from the JSON file (empty list if none yet)."""
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)


def save_sessions(sessions):
    """Write all study sessions back to the JSON file."""
    with open(DATA_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


def log_session():
    """Ask the user what they studied and for how long, then save it."""
    topic = input("What did you study? ")
    hours = float(input("How many hours? "))

    sessions = load_sessions()
    sessions.append(
        {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "topic": topic,
            "hours": hours,
        }
    )
    save_sessions(sessions)
    print(f"Saved: {hours}h on '{topic}'.\n")


def show_summary():
    """Show total hours and hours studied in the last 7 days."""
    sessions = load_sessions()
    if not sessions:
        print("No sessions logged yet. Go study something!\n")
        return

    total = sum(s["hours"] for s in sessions)

    today = datetime.now().strftime("%Y-%m-%d")
    today_hours = sum(s["hours"] for s in sessions if s["date"] == today)

    week_ago = datetime.now() - timedelta(days=7)
    this_week = sum(
        s["hours"]
        for s in sessions
        if datetime.strptime(s["date"], "%Y-%m-%d") >= week_ago
    )

    print("\n--- Study Summary ---")
    print(f"Total sessions : {len(sessions)}")
    print(f"Total hours    : {total}")
    print(f"Last 7 days    : {this_week}h")
    print(f"Today          : {today_hours}h / {DAILY_GOAL}h goal")
    print("---------------------")

    if today_hours >= DAILY_GOAL:
        print("[DONE] Daily goal hit! Nice work.\n")
    else:
        remaining = DAILY_GOAL - today_hours
        print(f"[..] {remaining}h left to hit today's goal.\n")


def main():
    while True:
        print("1) Log a study session")
        print("2) Show summary")
        print("3) Quit")
        choice = input("Choose: ").strip()

        if choice == "1":
            log_session()
        elif choice == "2":
            show_summary()
        elif choice == "3":
            print("Keep going. See you tomorrow.")
            break
        else:
            print("Pick 1, 2, or 3.\n")


if __name__ == "__main__":
    main()
