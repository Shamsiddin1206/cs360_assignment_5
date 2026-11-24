import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { TranscriptStore } from "../src/transcriptStore.js";

describe("TranscriptStore", () => {
  let store;

  beforeEach(() => {
    store = new TranscriptStore();
  });

  test("adds students and returns their transcripts", () => {
    const studentID = store.addStudent("Ada");

    assert.equal(studentID, 1);
    assert.deepEqual(store.getTranscript(studentID), {
      student: { studentID, studentName: "Ada" },
      grades: [],
    });
  });

  test("adds and changes a course grade", () => {
    const studentID = store.addStudent("Lin");

    assert.deepEqual(store.addGrade(studentID, "cs360", "85"), {
      studentID,
      course: "CS360",
      grade: 85,
    });
    assert.deepEqual(store.changeGrade(studentID, "CS360", 92), {
      studentID,
      course: "CS360",
      grade: 92,
    });
  });

  test("rejects invalid student, course, and grade inputs", () => {
    const studentID = store.addStudent("Noah");

    assert.throws(() => store.addStudent("   "), /Student name is required/);
    assert.throws(() => store.addGrade(studentID, "", 90), /Course name is required/);
    assert.throws(
      () => store.addGrade(studentID, "CS360", 101),
      /Grade must be an integer from 0 to 100/,
    );
  });

  test("supports exact-name lookup and deletion", () => {
    const firstID = store.addStudent("Grace Lee");
    const secondID = store.addStudent("Grace Hall");

    assert.deepEqual(store.getStudentIDs("Grace Lee"), [firstID]);
    store.deleteStudent(secondID);
    assert.deepEqual(store.getStudentIDs(), [firstID]);
    assert.throws(() => store.deleteStudent(secondID), /Student not found/);
  });

  test("BUG-103: name search trims whitespace and ignores case", () => {
    const studentID = store.addStudent("Grace Lee");
    store.addStudent("Grace Hall");

    assert.deepEqual(store.getStudentIDs("  grace LEE  "), [studentID]);
    assert.deepEqual(store.getStudentIDs("GRACE LEE"), [studentID]);
    assert.equal(store.getTranscript(studentID).student.studentName, "Grace Lee");
  });
  
  test("BUG-102: rejects a second grade for the same student and course", () => {
    const studentID = store.addStudent("Omar");
    store.addGrade(studentID, "CS360", 70);

    assert.throws(
      () => store.addGrade(studentID, " cs360 ", 95),
      /^Error: Grade already exists for course CS360$/,
    );
    assert.equal(store.getGrade(studentID, "CS360"), 70);
    assert.deepEqual(store.changeGrade(studentID, "CS360", 95), {
      studentID,
      course: "CS360",
      grade: 95,
    });
  });
  
  test("BUG-101: deleting a student also removes stored grades", () => {
    const studentID = store.addStudent("Mira");
    store.addGrade(studentID, "CS360", 88);

    store.deleteStudent(studentID);

    assert.equal(store.getGrade(studentID, "CS360"), undefined);
    assert.throws(() => store.getTranscript(studentID), /Student not found/);
  });

  test("REF-201: addGrade and changeGrade share course and grade validation", () => {
    const studentID = store.addStudent("Sara");
    store.addGrade(studentID, "CS360", 80);

    for (const method of ["addGrade", "changeGrade"]) {
      assert.throws(() => store[method](studentID, "  ", 90), /^Error: Course name is required$/);
      assert.throws(
        () => store[method](studentID, "CS360", 85.5),
        /^Error: Grade must be an integer from 0 to 100$/,
      );
      assert.throws(
        () => store[method](studentID, "CS360", -1),
        /^Error: Grade must be an integer from 0 to 100$/,
      );
      assert.throws(() => store[method](99, "CS360", 90), /^Error: Student not found: 99$/);
    }
    assert.deepEqual(store.changeGrade(studentID, " cs360 ", "100"), {
      studentID,
      course: "CS360",
      grade: 100,
    });
    assert.equal(store.getGrade(studentID, " cs360 "), 100);
  });
});
