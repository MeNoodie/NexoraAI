# AgentCare -- AI Hospital Administration Assistant

## Overview

AgentCare is an **AI-powered hospital administration assistant**, not a
diagnosis system.

It helps patients with: - Patient registration - Department routing -
Appointment booking/rescheduling/cancellation - Document upload and
organization - Appointment reminders - Follow-up scheduling - Human
escalation for emergencies or sensitive cases

> **Important:** The system never diagnoses diseases or prescribes
> medicines.

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   React
-   Tailwind CSS (recommended)
-   React Router
-   Axios

## Backend

-   FastAPI
-   LangGraph
-   Groq/OpenAI compatible LLM
-   SQLAlchemy
-   SQLite

------------------------------------------------------------------------

# Goal

Build an AI Receptionist that automates hospital administrative work.

------------------------------------------------------------------------

# User Journey

``` text
Landing Page
      ↓
Login / Register
      ↓
Patient Dashboard
      ↓
Chat with AI Assistant
      ↓
Intent Detection
      ↓
Department Routing
      ↓
Appointment Booking
      ↓
Upload Documents
      ↓
Confirmation
      ↓
Reminder
      ↓
Follow-up
```

------------------------------------------------------------------------

# UI

## Landing Page

-   Hero section
-   Get Started button
-   Login/Register

## Patient Dashboard

-   Welcome card
-   Upcoming appointment
-   Previous appointments
-   Upload documents
-   Chat assistant

## Admin Dashboard

-   Patient requests
-   Doctors
-   Appointment slots
-   Escalations
-   Audit log

------------------------------------------------------------------------

# Architecture

``` text
React UI
    │
FastAPI
    │
Supervisor Agent
    │
Routing Agent
    │
Appointment Agent
    │
Tools
    ├── Department Tool
    ├── Doctor Tool
    ├── Slot Tool
    ├── Appointment Tool
    └── Audit Tool
    │
SQLite
```

------------------------------------------------------------------------

# Agents

## 1. Supervisor Agent

Responsibilities: - Understand request - Maintain workflow - Delegate
tasks - Validate outputs

No database access.

## 2. Routing Agent

Input: Patient request

Output: - Department - Intent - Priority

Example:

"I need chest pain consultation"

↓

Department: Cardiology

If emergency keywords appear, create escalation instead of diagnosis.

## 3. Appointment Agent

Responsibilities: - Fetch doctors - Fetch slots - Book appointment -
Reschedule - Cancel

Uses backend tools only.

------------------------------------------------------------------------

# Backend Tools

-   register_patient()
-   get_department()
-   get_doctors()
-   get_available_slots()
-   book_appointment()
-   cancel_appointment()
-   reschedule_appointment()
-   upload_document()
-   create_reminder()
-   create_audit_log()

Agents never execute SQL directly.

------------------------------------------------------------------------

# Database Tables

-   users
-   patients
-   departments
-   doctors
-   appointment_slots
-   appointments
-   patient_documents
-   reminders
-   escalations
-   audit_logs

Seed dummy departments, doctors and slots.

------------------------------------------------------------------------

# Workflow

## New User

Login/Register

↓

Complete profile

↓

Describe problem

↓

Supervisor

↓

Routing

↓

Appointment

↓

Confirmation

------------------------------------------------------------------------

## Existing User

Login

↓

Dashboard shows: - Upcoming appointment - Follow-up - Previous visits

No need to ask name again.

------------------------------------------------------------------------

# Documents

Store: - File path - Document type - Upload date - Patient ID - Checksum

Detect duplicates.

No diagnosis from uploaded reports.

------------------------------------------------------------------------

# Safety

Never: - Diagnose - Prescribe - Recommend dosage

Emergency requests create an escalation record for hospital staff.

------------------------------------------------------------------------

# Folder Structure

``` text
backend/
    agents/
    tools/
    models/
    schemas/
    services/
    database/
    api/
    main.py

frontend/
    src/
        pages/
        components/
        hooks/
        services/
```

------------------------------------------------------------------------

# Development Plan

## Day 1

-   FastAPI
-   SQLite
-   SQLAlchemy
-   Authentication
-   React pages
-   Database models
-   Seed doctors

## Day 2

-   Supervisor Agent
-   Routing Agent
-   Appointment Agent
-   Booking flow
-   Audit logs

## Day 3

-   Document upload
-   Reminder
-   Escalation
-   Full integration

## Day 4

-   Testing
-   Error handling
-   UI polishing

## Day 5-6

-   Deployment
-   README
-   Presentation
-   Demo video

------------------------------------------------------------------------

# Demo Flow

1.  User logs in.
2.  Dashboard loads upcoming appointments.
3.  User says: "I need a cardiology appointment next week."
4.  Supervisor delegates.
5.  Routing selects Cardiology.
6.  Appointment Agent books a slot.
7.  User uploads ECG.
8.  Confirmation shown.
9.  Reminder created.
10. Audit log stored.

------------------------------------------------------------------------

# Future Enhancements

-   Voice conversation
-   Multi-language
-   Email/SMS reminders
-   MCP integration
-   RAG for hospital policies
-   Analytics dashboard
