# Project Spark — Product Specification

**Status:** Draft v1 · **Source:** `Spec.txt` (original notes) · **Stack:** TanStack Start, React 19, Tailwind 4, shadcn/Radix UI (see `package.json`)

## 1. Overview

Project Spark is a web app for classroom sign-in. Three students sign in at fixed points in the school day by tapping a large button with their name. The app tells each student whether they were on time, early or late, and shows the result in a clear green or red. A teacher controls whether sign-in is available, protected by a password.

## 2. Goals and non-goals

**Goals**
- Let a student sign in with one tap, with no typing and no login.
- Give immediate, unambiguous feedback: a greeting plus how early or late they were.
- Let the teacher enable or disable sign-in and review what was recorded.

**Non-goals (v1)**
- Student accounts or per-student passwords.
- More than three students, multiple classes or multiple schools (see §10).
- Notifications to parents.

## 3. Users

| User | Description | Needs |
|---|---|---|
| Student (3) | Hindy Fisch, Mindy Katina, Esty Oberlander | Large, obvious button; clear feedback on whether they were on time |
| Teacher | Runs the class and owns the device | Enable or disable sign-in; see attendance; keep students from changing settings |

## 4. Sign-in windows

Times are in the device's local time zone. Each window has a start, an on-time cutoff and a greeting.

| # | Window | Start | On-time until | Greeting |
|---|---|---|---|---|
| 1 | Arrival | 10:00 | 10:15 | "Good Morning" |
| 2 | After recess | 11:28 | 11:33 | "Good day" |
| 3 | After lunch | 1:25 PM (13:25) | **TBD** (proposed 1:30 PM) | "Good Afternoon" |

Window definitions live in a single configuration object rather than being scattered through the code, so they can be edited later (and made teacher-editable in a future version).

## 5. Functional requirements

### 5.1 Student screen
- **FR-1** Show one large button per student, labelled with their full name.
- **FR-2** Show the current time and the current window name.
- **FR-3** Tapping a button records a sign-in for that student in the current window and shows the confirmation message (§5.3).
- **FR-4** A student can sign in once per window. Later taps show the existing sign-in ("You already signed in at 10:07") and do not create a new record.
- **FR-5** When sign-in is disabled, the buttons are visibly inactive and a short message says so.

### 5.2 Timing and status
- **FR-6** A sign-in is *on time* if it happens from the window start up to and including the on-time cutoff, and *late* from the first second after the cutoff minute (10:15:59 is still on time; 10:16:00 is late).
- **FR-7** Minutes early or late are rounded to whole minutes, and the message says "on time" for the exact minute. "Early" applies only if sign-in is possible before the window start (see Q2).
- **FR-8** Colour coding applies to both the buttons and the message:
  - **Green:** within the allotted time frame.
  - **Red:** after the cutoff.
  - Colours reset to green automatically when the next window's start time arrives.
- **FR-9** Colour must not be the only signal. The message text always states "on time", "X min early" or "X min late".

### 5.3 Confirmation message
Format: `"<Greeting>, <Student Name>! You signed in <N> min <early|late>."`

Examples:
- `Good Morning, Hindy Fisch! You signed in 3 min early.` (green)
- `Good day, Mindy Katina! You signed in 2 min late.` (red)
- `Good Afternoon, Esty Oberlander! You signed in right on time.` (green)

The greeting follows the window (§4). The message stays visible for a few seconds, then the screen returns to its normal state.

### 5.4 Teacher controls
- **FR-10** A teacher area is protected by a password. Students cannot reach it by tapping the student screen.
- **FR-11** The teacher can enable or disable sign-in.
- **FR-12** The teacher can view recorded sign-ins: student, window, time, on-time or late and minutes (from the roadmap item "teacher can view attendance").
- **FR-13** The attendance page is view-only (no clear or edit). The teacher can download a CSV backup. The page locks after 5 minutes of inactivity, or when the teacher taps Lock.

### 5.5 Data recorded
Each sign-in stores: student, window, timestamp, status (`early | on_time | late`), minutes difference.

## 6. Non-functional requirements
- **Usability:** buttons large enough for easy tapping on a tablet. The clock and greeting are prominent, and the student buttons are compact and side by side (current design decision from the roadmap).
- **Visual design:** clean look with no animated or moving elements (roadmap).
- **Accessibility:** sufficient colour contrast, text and not colour alone carries meaning, and buttons are keyboard-operable.
- **Reliability:** window status is computed from the system clock on each render and does not depend on a timer firing exactly.
- **Security:** the teacher password is not stored in plain text in client code. See Q4.
- **Privacy:** only students' names and sign-in times are stored.

## 7. Open questions and proposed defaults

| # | Question (from `Spec.txt` unless noted) | Proposed default |
|---|---|---|
| Q1 | Allow sign-in after a window closes, and for how long? | Allow it, shown red, until the next window starts. After lunch, sign-in closes at **3:00 PM** (end of school day). A student who arrives late should still be able to record it. |
| Q2 | Can students sign in before a window starts? | No. Buttons are inactive before the start. "Early" then means early within the window (before the on-time cutoff). Needs your confirmation, since the spec says "early". |
| Q3 | Do timings update automatically or are they teacher-enabled? | Windows turn on and off automatically by the clock. The teacher's enable switch is a master override on top of that. |
| Q4 | Where do the teacher password and the records live? (new) | v1: browser local storage with a hashed password. Needs a backend if records must be shared across devices. |
| Q5 | After-lunch cutoff? (new) | 1:30 PM, matching the 5-minute pattern of the other windows. |
| Q6 | Does "1:25" mean 13:25? (new) | Yes. |
| Q7 | Do school days or weekends matter? (new) | Ignore in v1, but it is trivial to add a weekday check. |

## 8. Current state (from `roadmap.md`)
- [x] Student buttons small, side by side; clock and greeting big
- [x] Show current window name, colourful
- [ ] Record student arrival times; teacher can view attendance
- [ ] Cleaner look, no moving elements

## 9. Acceptance criteria
1. At 10:07 tapping "Hindy Fisch" shows a green "Good Morning, Hindy Fisch!" message with the on-time or early wording, and one record is saved.
2. At 10:20 the same tap shows a red message with "5 min late".
3. At 11:28 the buttons and message are green again, and the greeting is "Good day".
4. A second tap in the same window does not create a second record.
5. With sign-in disabled by the teacher, no tap records anything.
6. Wrong teacher password gives no access to the teacher area.
7. The teacher can see a list of today's sign-ins with status.

## 10. Future ideas
- Teacher-editable windows and student list.
- Shared storage across devices (backend).
- Weekly or monthly attendance export (CSV).
- Per-student streaks or reminders.
