import React, { useState } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import "./App.css";
import login from "./login/login/lo"

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // SIGNUP
  const handleSignup = () => {
    createUserWithEmailAndPassword(auth, "rohitsutharrr@gmail.com", "123456789")
      .then((userCred) => {
        alert("Signup Successful!");
      })
      .catch((err) => alert(err.message));
  };

  // LOGIN
  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCred) => {
        alert("Login Successful!");
      })
      .catch((err) => alert(err.message));
  };

  // PUT DATA
  const putData = () => {
    set(ref(db, "users/rohit"), {
      id: 0,
      name: "rohit",
    });
  };

  return (
    <div className="App">
      <h1>Firebase React App</h1>

      <input
        type="email"
        placeholder="Enter Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />

      <input
        type="password"
        placeholder="Enter Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />

      <button onClick={handleSignup}>Signup</button>
      <button onClick={handleLogin}>Login</button>
      <button onClick={putData}>Put Data</button>
    </div>
  );
}

export default App;
