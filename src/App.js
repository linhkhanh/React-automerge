import "./App.css";
import * as Automerge from "@automerge/automerge";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  List,
  ListItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { useState } from "react";
import React from "react";

const Input = ({ label, name, register, required }) => (
  <>
    <label>{label}</label>
    <input {...register(name, { required })} />
  </>
);

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

let doc = Automerge.init();

function App() {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      studentName: "Sample Name",
      age: 15,
      class: "Class A1",
    },
  });
  const [student, setStudent] = useState({});

  let docId = "student";
  let channel = new BroadcastChannel(docId);

  function saveToRemote(docId, binary) {
    fetch(`http://localhost:5000/${docId}`, {
      body: binary,
      method: "post",
      headers: {
        "Content-Type": "application/octet-stream",
      },
    }).catch((err) => console.log(err));
  }

  function updateDoc(newDoc) {
    doc = newDoc;
    setStudent(doc.student);
    let binary = Automerge.save(newDoc);
    channel.postMessage(binary);
    saveToRemote(docId, binary); // <-- this line is new
  }

  async function loadFromRemote(docId) {
    const response = await fetch(`http://localhost:5000/${docId}`);
    if (response.status !== 200)
      throw new Error("No saved draft for doc with id=" + docId);
    const respbuffer = await response.arrayBuffer();
    if (respbuffer.byteLength === 0)
      throw new Error("No saved draft for doc with id=" + docId);
    const view = new Uint8Array(respbuffer);
    let newDoc = Automerge.merge(doc, Automerge.load(view));
    doc = newDoc;
    console.log("doc", doc);
    setStudent(doc.student);
  }

  // Call when the app starts up
  loadFromRemote(docId);
  channel.onmessage = (ev) => {
    let newDoc = Automerge.merge(doc, Automerge.load(ev.data));
    doc = newDoc;
    setStudent(doc.student);
    setValue("age", doc.student.age);
    setValue("class", doc.student.class);
    setValue("studentName", doc.student.studentName);
  };

  function editStudent(data) {
    let newDoc = Automerge.change(
      doc,
      `Edit Student ${data.studentName}, ${data.age}, ${data.class} `,
      (doc) => {
        if (!doc.student) doc.student = {};
        doc.student.studentName = data.studentName;
        doc.student.age = data.age;
        doc.student.class = data.class;
      }
    );
    updateDoc(newDoc);
  }
  const onSubmit = (data) => {
    editStudent(data);
  };

  const [historyList, setHistoryList] = useState([]);

  function getHistory() {
    const history = Automerge.getHistory(doc).map((state) => [
      state.change.message,
      state.snapshot.student,
    ]);
    console.log("history", history);
    setHistoryList(history);
  }

  function renderHistory() {
    return (
      <List>
        {historyList.map((history, index) => {
          console.log(history);
          if (history[0]) return <ListItem key={index}>{history[0]}</ListItem>;
          return null;
        })}
      </List>
    );
  }

  const renderStudent = () => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Item>
            <Typography>Student Name</Typography>
          </Item>
        </Grid>
        <Grid item xs={8}>
          <Item>
            <Typography>{student.studentName}</Typography>
          </Item>
        </Grid>
        <Grid item xs={4}>
          <Item>
            <Typography>Student Age</Typography>
          </Item>
        </Grid>
        <Grid item xs={8}>
          <Item>
            <Typography>{student.age}</Typography>
          </Item>
        </Grid>
        <Grid item xs={4}>
          <Item>
            <Typography>Class</Typography>
          </Item>
        </Grid>
        <Grid item xs={8}>
          <Item>
            <Typography>{student.class}</Typography>
          </Item>
        </Grid>
      </Grid>
    );
  };

  return (
    <div className="App">
      <Box p={2} alignItems={"center"}>
        <Typography variant="h4">Testing Automerge</Typography>
        <Box display="flex" alignItems={"center"} p={5}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Student Name"
              name={"studentName"}
              register={register}
              required
            />
            <Input label="Age" name={"age"} register={register} required />

            <Input label="Class" name={"class"} register={register} required />

            <input type="submit" />
          </form>
        </Box>
        {student && renderStudent()}
      </Box>
      <Button onClick={() => getHistory()}>History</Button>
      {renderHistory()}
    </div>
  );
}

export default App;
