# React Syntax Explanation - Complete Guide

## Understanding Every Line of React Code in This Project

This document explains EVERY syntax element used in our React/Next.js dental clinic system.

---

## Table of Contents
1. [File Extensions (.tsx vs .jsx)](#file-extensions)
2. [Import Statements](#import-statements)
3. [React Hooks](#react-hooks)
4. [JSX Syntax](#jsx-syntax)
5. [Components](#components)
6. [Props and State](#props-and-state)
7. [Event Handlers](#event-handlers)
8. [Conditional Rendering](#conditional-rendering)
9. [List Rendering](#list-rendering)
10. [TypeScript with React](#typescript-with-react)

---

## 1. File Extensions

### Why `.tsx` instead of `.js`?

```tsx
// ✅ Our files: login/page.tsx, dashboard/page.tsx
// Why TSX?
// .tsx = TypeScript + JSX (React's HTML-like syntax)
// .jsx = JavaScript + JSX
// .ts  = TypeScript only
// .js  = JavaScript only
```

**Explanation:**
- **TSX** = **T**ype**S**cript + JS**X**
- Combines TypeScript's type checking with React's JSX syntax
- Makes our code more reliable and catches errors before runtime

---

## 2. Import Statements

### Example from `app/login/page.tsx`:

```tsx
"use client"                              // Line 1: Next.js directive
                                          // ↓ Tells Next.js this runs on client-side

import type React from "react"           // Line 3: TypeScript type import
//     ↑ TypeScript keyword               // ↓ Importing React types
//          ↑ The React library name

import { useState } from "react"          // Line 5: Import specific React Hook
//       ↑ Named import (curly braces)    // ↓ From the React library
//         ↑ React Hook for state         //   (installed in node_modules)

import Link from "next/link"              // Line 6: Import Next.js component
//     ↑ Default import (no braces)       // ↓ Next.js navigation component

import { useRouter } from "next/navigation"  // Line 7: Import Next.js hook
//       ↑ Named import                       // ↓ For programmatic navigation

import { useAuth } from "@/lib/auth"      // Line 8: Import our custom hook
//       ↑ Named import                   // ↓ @ = alias for project root
//         ↑ Our custom React hook            // /lib/auth = file path
```

### Import Syntax Breakdown:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. DEFAULT IMPORT (no curly braces)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import React from "react"
//     ↑ Can name it anything (convention: use actual name)

import MyComponent from "./MyComponent"
//     ↑ Imports the default export from that file


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. NAMED IMPORT (with curly braces)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { useState, useEffect } from "react"
//       ↑ Must use EXACT names from the library
//         ↑ Can import multiple items

import { useAuth } from "@/lib/auth"
//       ↑ MUST match the exported name


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. TYPE IMPORT (TypeScript only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import type React from "react"
//     ↑ TypeScript: imports ONLY types, not runtime code

import type { ReactNode } from "react"
//            ↑ Importing a type definition


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. PATH ALIASES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { useAuth } from "@/lib/auth"
//                      ↑ @ = alias for project root folder
//                        Defined in tsconfig.json

// Without alias: import { useAuth } from "../../lib/auth"
// With alias:    import { useAuth } from "@/lib/auth"
//                ↑ Cleaner, easier to read
```

---

## 3. React Hooks

### What are Hooks?
**Hooks** are special React functions that let you use React features in functional components.

### Example from `app/patient/dashboard/page.tsx`:

```tsx
import { useState, useEffect } from "react"
//       ↑ State Hook  ↑ Effect Hook

export default function PatientDashboard() {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // useState Hook - Manages component state
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const [appointments, setAppointments] = useState([])
  //     ↑ Current state value
  //                    ↑ Function to update state
  //                                    ↑ useState is the Hook
  //                                              ↑ Initial value (empty array)

  const [isLoading, setIsLoading] = useState(true)
  //     ↑ State: isLoading
  //                ↑ Updater: setIsLoading
  //                                   ↑ Initial value: true

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // useEffect Hook - Run code after render (side effects)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  useEffect(() => {
  // ↑ The Hook
    //  ↑ Arrow function - code to run
    
    // This code runs AFTER component renders
    const fetchData = async () => {
      const data = await api.getAppointments(token)
      setAppointments(data)  // Update state
    }
    
    fetchData()
    
  }, [token])
  //  ↑ Dependency array
  //    Effect runs again if 'token' changes
  
  return <div>...</div>
}
```

### useState Syntax Explained:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATTERN: Array Destructuring
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const [value, setValue] = useState(initialValue)
//     ↑      ↑           ↑         ↑
//     |      |           |         └─ Initial value
//     |      |           └─────────── Hook function
//     |      └─────────────────────── Setter function
//     └────────────────────────────── Current value

// Example 1: String state
const [name, setName] = useState("")
//     ↑ name = ""
//            ↑ setName("John") → updates name to "John"

// Example 2: Number state
const [count, setCount] = useState(0)
//     ↑ count = 0
//             ↑ setCount(5) → updates count to 5

// Example 3: Boolean state
const [isOpen, setIsOpen] = useState(false)
//     ↑ isOpen = false
//              ↑ setIsOpen(true) → updates isOpen to true

// Example 4: Array state
const [items, setItems] = useState([])
//     ↑ items = []
//             ↑ setItems([1, 2, 3]) → updates items

// Example 5: Object state
const [user, setUser] = useState({ name: "", age: 0 })
//     ↑ user = { name: "", age: 0 }
//           ↑ setUser({ name: "John", age: 25 })
```

### useEffect Syntax Explained:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PATTERN: Side Effect Hook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useEffect(() => {
  // Code to run
}, [dependencies])

// Example 1: Run once on mount (empty dependency array)
useEffect(() => {
  console.log("Component mounted!")
}, [])  // ← Empty array = run only once

// Example 2: Run when specific value changes
useEffect(() => {
  fetchData()
}, [userId])  // ← Runs when userId changes

// Example 3: Run on every render (no dependency array)
useEffect(() => {
  console.log("Component rendered!")
})  // ← No array = runs every render

// Example 4: Cleanup function
useEffect(() => {
  const timer = setInterval(() => {
    console.log("Tick")
  }, 1000)
  
  return () => clearInterval(timer)  // ← Cleanup when unmounting
}, [])
```

---

## 4. JSX Syntax

### What is JSX?
**JSX** = **J**ava**S**cript **X**ML - A syntax extension that lets you write HTML-like code in JavaScript.

### Example from `app/login/page.tsx`:

```tsx
return (
  <div className="min-h-screen bg-[var(--color-background)] flex items-center">
    {/* ↑ HTML-like tag in JavaScript! This is JSX */}
    {/* ↑ className (not class - because 'class' is a JS keyword) */}
    
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold">
        {/* ↑ Regular HTML tags work in JSX */}
        Login to Your Account
      </h1>
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* JavaScript Expressions in JSX - Use { } */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      <p>Welcome, {user.name}</p>
      {/*          ↑ JavaScript expression in curly braces */}
      
      <p>Total: {count + 5}</p>
      {/*        ↑ Math expression */}
      
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      {/*          ↑ Ternary operator (conditional) */}
    </div>
  </div>
)
```

### JSX Rules:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. MUST RETURN A SINGLE PARENT ELEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Wrong - Multiple root elements
return (
  <div>First</div>
  <div>Second</div>
)

// ✅ Correct - Single parent
return (
  <div>
    <div>First</div>
    <div>Second</div>
  </div>
)

// ✅ Also correct - Fragment (empty tag)
return (
  <>
    <div>First</div>
    <div>Second</div>
  </>
)


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. USE className INSTEAD OF class
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Wrong - 'class' is a reserved JavaScript keyword
<div class="container">

// ✅ Correct - Use 'className'
<div className="container">


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. SELF-CLOSING TAGS MUST HAVE /
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Wrong - Missing closing slash
<img src="photo.jpg">
<input type="text">

// ✅ Correct - Self-closing with /
<img src="photo.jpg" />
<input type="text" />


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. JAVASCRIPT EXPRESSIONS IN { }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const name = "John"
const age = 25

<div>
  <p>Name: {name}</p>              {/* Variable */}
  <p>Age: {age}</p>                {/* Variable */}
  <p>Birth Year: {2025 - age}</p>  {/* Expression */}
  <p>Adult: {age >= 18 ? "Yes" : "No"}</p>  {/* Conditional */}
</div>


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. INLINE STYLES USE DOUBLE BRACES {{ }}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Outer { } = JavaScript expression
// Inner { } = JavaScript object

<div style={{ color: "red", fontSize: "20px" }}>
  {/*      ↑ Outer braces: JS expression */}
  {/*       ↑ Inner braces: JS object */}
  Text
</div>

// Same as:
const styles = { color: "red", fontSize: "20px" }
<div style={styles}>Text</div>


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. COMMENTS IN JSX USE {/* */}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<div>
  {/* This is a comment in JSX */}
  <p>Text</p>
  {/* Multi-line
      comment
      works too */}
</div>
```

---

## 5. Components

### What are Components?
**Components** are reusable pieces of UI. They're JavaScript functions that return JSX.

### Example - Function Component:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT DEFINITION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function LoginPage() {
//     ↑ export default = make this the main export
//             ↑ function = JavaScript function
//                     ↑ LoginPage = Component name (PascalCase)
//                               ↑ () = no parameters (or can have props)

  // JavaScript code here (hooks, variables, functions)
  const [username, setUsername] = useState("")
  
  // MUST return JSX
  return (
    <div>
      <h1>Login</h1>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USING THE COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// In another file:
import LoginPage from "./login/page"

function App() {
  return (
    <div>
      <LoginPage />
      {/*  ↑ Component used like an HTML tag */}
    </div>
  )
}
```

### Component with Props:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT WITH PROPS (Properties = Data passed to component)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Define the component
function Greeting({ name, age }) {
  //            ↑ Props object - destructured
  //              { name, age } extracts properties
  
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>You are {age} years old.</p>
    </div>
  )
}

// Use the component (pass props)
<Greeting name="John" age={25} />
{/*       ↑ String prop (quotes)
              ↑ Number prop (curly braces) */}

// With TypeScript (type safety):
interface GreetingProps {
  name: string
  age: number
}

function Greeting({ name, age }: GreetingProps) {
  //                            ↑ Type annotation
  return <div>...</div>
}
```

---

## 6. Props and State

### Props vs State:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROPS - Data passed FROM parent TO child (READ-ONLY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Parent component
function ParentComponent() {
  return (
    <ChildComponent 
      title="Hello"
      count={5}
      isActive={true}
    />
  )
}

// Child component receives props
function ChildComponent({ title, count, isActive }) {
  //                      ↑ Props destructured from props object
  
  // ❌ Cannot modify props!
  // title = "New Title"  // This is wrong!
  
  return <div>{title}: {count}</div>
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE - Data managed INSIDE component (CAN CHANGE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Counter() {
  // State is created and managed here
  const [count, setCount] = useState(0)
  //     ↑ State variable
  //            ↑ Function to update state
  
  // ✅ Can modify state using setter
  const increment = () => {
    setCount(count + 1)  // This is correct!
  }
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  )
}
```

---

## 7. Event Handlers

### Example from `app/login/page.tsx`:

```tsx
function LoginPage() {
  const [username, setUsername] = useState("")
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EVENT HANDLER FUNCTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const handleSubmit = (e: React.FormEvent) => {
  //                    ↑ Parameter: event object
  //                       ↑ TypeScript type for form events
    
    e.preventDefault()  // Prevent form default behavior
    //↑ Event object method
    
    // Your code here
    login(username, password)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/*  ↑ Event name (camelCase)
               ↑ Handler function (no parentheses!) */}
      
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        {/*      ↑ Inline arrow function
                    ↑ e = event object
                        ↑ e.target = the input element
                              ↑ .value = the input's value */}
      />
      
      <button onClick={() => console.log("Clicked!")}>
        {/*     ↑ onClick event
                   ↑ Inline function */}
        Submit
      </button>
    </form>
  )
}
```

### Common Events:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOUSE EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<button onClick={() => alert("Clicked!")}>Click Me</button>
<div onDoubleClick={() => console.log("Double clicked")}>...</div>
<div onMouseEnter={() => console.log("Mouse entered")}>...</div>
<div onMouseLeave={() => console.log("Mouse left")}>...</div>


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FORM EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<form onSubmit={(e) => {
  e.preventDefault()
  // Handle form submission
}}>
  <input onChange={(e) => console.log(e.target.value)} />
  <input onFocus={() => console.log("Focused")} />
  <input onBlur={() => console.log("Lost focus")} />
</form>


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KEYBOARD EVENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<input onKeyDown={(e) => console.log("Key pressed:", e.key)} />
<input onKeyUp={(e) => console.log("Key released")} />
<input onKeyPress={(e) => console.log("Key pressed")} />
```

---

## 8. Conditional Rendering

### Example from our code:

```tsx
function Dashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState([])
  
  return (
    <div>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* METHOD 1: && Operator (Logical AND) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      {isLoading && <p>Loading...</p>}
      {/* ↑ If isLoading is true, show <p>Loading...</p> */}
      {/* ↑ If isLoading is false, show nothing */}
      
      {error && <p>Error: {error}</p>}
      {/* ↑ If error exists (truthy), show error message */}
      
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* METHOD 2: Ternary Operator (? :) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <p>Loaded!</p>
      )}
      {/* ↑ If isLoading is true, show "Loading..."
          ↑ Otherwise, show "Loaded!" */}
      
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* METHOD 3: Multiple Conditions */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : data.length === 0 ? (
        <p>No data found</p>
      ) : (
        <div>Data: {data}</div>
      )}
      {/* ↑ Nested ternary operators */}
      {/* Check multiple conditions */}
      
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* METHOD 4: If Statement (outside JSX) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      {(() => {
        if (isLoading) return <p>Loading...</p>
        if (error) return <p>Error: {error}</p>
        if (data.length === 0) return <p>No data</p>
        return <div>Data: {data}</div>
      })()}
      {/* ↑ Immediately invoked function expression (IIFE) */}
    </div>
  )
}
```

---

## 9. List Rendering

### Example from `app/patient/appointments/page.tsx`:

```tsx
function AppointmentsList() {
  const appointments = [
    { id: 1, date: "2025-01-15", doctor: "Dr. Smith" },
    { id: 2, date: "2025-01-20", doctor: "Dr. Jones" },
    { id: 3, date: "2025-01-25", doctor: "Dr. Brown" }
  ]
  
  return (
    <div>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* RENDERING A LIST WITH .map() */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      {appointments.map((appointment) => (
        {/* ↑ .map() = array method
               ↑ appointment = each item
                   ↑ Arrow function returns JSX for each item */}
        
        <div key={appointment.id}>
          {/* ↑ key prop is REQUIRED for lists
                 ↑ Must be unique identifier
                 ↑ Helps React track changes */}
          
          <p>Date: {appointment.date}</p>
          <p>Doctor: {appointment.doctor}</p>
        </div>
      ))}
    </div>
  )
}
```

### Detailed .map() Explanation:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BASIC ARRAY MAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const numbers = [1, 2, 3, 4, 5]

// Regular JavaScript .map():
const doubled = numbers.map((num) => num * 2)
// Result: [2, 4, 6, 8, 10]

// React JSX .map():
<div>
  {numbers.map((num) => (
    <p key={num}>{num}</p>
  ))}
</div>
// Renders: <p>1</p> <p>2</p> <p>3</p> <p>4</p> <p>5</p>


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WITH OBJECTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const users = [
  { id: 1, name: "John", age: 25 },
  { id: 2, name: "Jane", age: 30 },
  { id: 3, name: "Bob", age: 35 }
]

<div>
  {users.map((user) => (
    <div key={user.id}>
      {/*  ↑ key must be unique */}
      <h3>{user.name}</h3>
      <p>Age: {user.age}</p>
    </div>
  ))}
</div>


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WITH INDEX (second parameter)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const items = ["Apple", "Banana", "Cherry"]

<ul>
  {items.map((item, index) => (
    {/*            ↑ index = position in array (0, 1, 2...) */}
    <li key={index}>
      {index + 1}. {item}
    </li>
  ))}
</ul>
// Renders: 1. Apple
//          2. Banana
//          3. Cherry
```

---

## 10. TypeScript with React

### Type Annotations:

```tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERFACE - Define object shape
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface User {
  id: number
  name: string
  email: string
  age?: number     // ← Optional property (?)
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPE ALIAS - Similar to interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type Status = "pending" | "confirmed" | "cancelled"
//            ↑ Union type - can only be one of these values


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPING COMPONENT PROPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GreetingProps {
  name: string
  age: number
  isAdmin: boolean
}

function Greeting({ name, age, isAdmin }: GreetingProps) {
  //                                      ↑ Type annotation
  return <div>Hello {name}</div>
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPING STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// TypeScript infers the type
const [count, setCount] = useState(0)
//    ↑ TypeScript knows count is number

// Explicit type
const [user, setUser] = useState<User | null>(null)
//                               ↑ Generic type parameter
//                                ↑ User or null


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPING EVENT HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  //                     ↑ React event type
  //                          ↑ Mouse event
  //                                  ↑ On button element
  console.log("Clicked!")
}

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //                      ↑ Change event on input
  console.log(e.target.value)
}

const handleSubmit = (e: React.FormEvent) => {
  //                      ↑ Form submission event
  e.preventDefault()
}
```

---

## Complete Example: Putting It All Together

### Example: Login Component with All Syntax Explained

```tsx
"use client"  // Next.js: runs on client-side
// ↑ Directive (not React, but Next.js)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IMPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { useState } from "react"
//       ↑ Named import of React Hook

import { useRouter } from "next/navigation"
//       ↑ Next.js hook for navigation

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPESCRIPT INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface LoginForm {
  username: string
  password: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REACT COMPONENT (Function)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function LoginPage() {
  // ↑ Export default = main export
  //         ↑ function = JavaScript function
  //                 ↑ LoginPage = Component name (PascalCase required)
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REACT HOOKS (must be at top of component)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const [formData, setFormData] = useState<LoginForm>({
    //   ↑ State variable
    //            ↑ Setter function
    //                      ↑ useState Hook
    //                                ↑ TypeScript generic type
    username: "",
    password: ""
  })
  //↑ Initial state value (object)
  
  const [error, setError] = useState<string>("")
  //                                  ↑ Type annotation: string
  
  const [isLoading, setIsLoading] = useState<boolean>(false)
  //                                          ↑ Type: boolean
  
  const router = useRouter()
  //    ↑ Variable to store router object
  //            ↑ Next.js navigation hook
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EVENT HANDLER FUNCTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const handleSubmit = async (e: React.FormEvent) => {
    //                   ↑ async = asynchronous function
    //                         ↑ e = event object
    //                            ↑ TypeScript type for form events
    
    e.preventDefault()
    // ↑ Prevent default form submission (page reload)
    
    setIsLoading(true)
    // ↑ Update state to show loading
    
    try {
      // Try to login
      await login(formData.username, formData.password)
      // ↑ await = wait for async operation
      
      router.push("/dashboard")
      // ↑ Navigate to dashboard
      
    } catch (err) {
      // ↑ Catch errors
      setError("Invalid credentials")
      // ↑ Update error state
      
    } finally {
      // ↑ Always runs (success or error)
      setIsLoading(false)
      // ↑ Stop loading
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //                            ↑ Type for input change events
    
    const { name, value } = e.target
    //      ↑ Destructure name and value from input element
    
    setFormData({
      ...formData,  // ← Spread operator: copy existing data
      [name]: value // ← Update specific field (computed property)
    })
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RETURN JSX (Required in React components)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  return (
    <div className="container">
      {/* ↑ JSX starts here */}
      {/* ↑ className (not class) */}
      
      <h1>Login</h1>
      
      {/* Conditional Rendering: Show error if exists */}
      {error && (
        <div className="error">
          {error}
          {/* ↑ JavaScript expression in curly braces */}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/*   ↑ Event handler (camelCase)
                  ↑ Function reference (no parentheses!) */}
        
        <input
          type="text"
          name="username"
          value={formData.username}
          {/*   ↑ Controlled input: value from state */}
          onChange={handleInputChange}
          {/*      ↑ Update state when input changes */}
          placeholder="Username"
          required
          {/* ↑ Boolean attribute (no value needed) */}
        />
        
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
        />
        
        <button type="submit" disabled={isLoading}>
          {/*                   ↑ Disabled if loading */}
          
          {/* Conditional rendering: Show different text */}
          {isLoading ? "Logging in..." : "Login"}
          {/* ↑ Ternary operator: condition ? true : false */}
        </button>
      </form>
    </div>
  )
  // ↑ End of return statement
}
// ↑ End of component function
```

---

## Summary: React Syntax Checklist

### ✅ Core React Concepts:
1. **Imports** - `import { useState } from "react"`
2. **Components** - Functions that return JSX
3. **JSX** - HTML-like syntax in JavaScript
4. **Hooks** - `useState`, `useEffect`, custom hooks
5. **Props** - Data passed to components
6. **State** - Data managed inside components
7. **Events** - `onClick`, `onChange`, etc.
8. **Conditional Rendering** - `&&`, `? :`, `if`
9. **List Rendering** - `.map()` with `key` prop
10. **TypeScript** - Type annotations for safety

### ✅ Key Syntax Rules:
- Components = PascalCase: `LoginPage`, not `loginPage`
- Props/events = camelCase: `onClick`, not `onclick`
- Use `className` not `class`
- Self-closing tags need `/`: `<img />`
- JavaScript in JSX = curly braces `{}`
- Single parent element or Fragment `<>...</>`
- Array items need `key` prop

---

**This IS React!** Every piece of syntax in this document is standard React. The fact that we're using Next.js and TypeScript doesn't change that - these are just enhancements built ON TOP OF React.

**Prepared by:** Development Team  
**Date:** October 17, 2025  
**Framework:** React 19 with Next.js 15 and TypeScript
