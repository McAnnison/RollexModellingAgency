import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddNewUserData {
  user_insert: User_Key;
}

export interface AddNewUserVariables {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  passwordHash: string;
  phoneNumber?: string | null;
  role: string;
}

export interface Course_Key {
  id: UUIDString;
  __typename?: 'Course_Key';
}

export interface EnrollStudentInCourseData {
  enrollment_insert: Enrollment_Key;
}

export interface EnrollStudentInCourseVariables {
  studentId: UUIDString;
  courseId: UUIDString;
}

export interface Enrollment_Key {
  studentId: UUIDString;
  courseId: UUIDString;
  __typename?: 'Enrollment_Key';
}

export interface GetUserByEmailData {
  users: ({
    id: UUIDString;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    role: string;
  } & User_Key)[];
}

export interface GetUserByEmailVariables {
  email: string;
}

export interface ListCoursesForStudentData {
  student?: {
    courses_via_Enrollment: ({
      id: UUIDString;
      courseCode: string;
      name: string;
      description?: string | null;
      credits?: number | null;
    } & Course_Key)[];
  };
}

export interface ListCoursesForStudentVariables {
  studentId: UUIDString;
}

export interface Registration_Key {
  id: UUIDString;
  __typename?: 'Registration_Key';
}

export interface Student_Key {
  id: UUIDString;
  __typename?: 'Student_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface AddNewUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNewUserVariables): MutationRef<AddNewUserData, AddNewUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddNewUserVariables): MutationRef<AddNewUserData, AddNewUserVariables>;
  operationName: string;
}
export const addNewUserRef: AddNewUserRef;

export function addNewUser(vars: AddNewUserVariables): MutationPromise<AddNewUserData, AddNewUserVariables>;
export function addNewUser(dc: DataConnect, vars: AddNewUserVariables): MutationPromise<AddNewUserData, AddNewUserVariables>;

interface GetUserByEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserByEmailVariables): QueryRef<GetUserByEmailData, GetUserByEmailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserByEmailVariables): QueryRef<GetUserByEmailData, GetUserByEmailVariables>;
  operationName: string;
}
export const getUserByEmailRef: GetUserByEmailRef;

export function getUserByEmail(vars: GetUserByEmailVariables): QueryPromise<GetUserByEmailData, GetUserByEmailVariables>;
export function getUserByEmail(dc: DataConnect, vars: GetUserByEmailVariables): QueryPromise<GetUserByEmailData, GetUserByEmailVariables>;

interface EnrollStudentInCourseRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: EnrollStudentInCourseVariables): MutationRef<EnrollStudentInCourseData, EnrollStudentInCourseVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: EnrollStudentInCourseVariables): MutationRef<EnrollStudentInCourseData, EnrollStudentInCourseVariables>;
  operationName: string;
}
export const enrollStudentInCourseRef: EnrollStudentInCourseRef;

export function enrollStudentInCourse(vars: EnrollStudentInCourseVariables): MutationPromise<EnrollStudentInCourseData, EnrollStudentInCourseVariables>;
export function enrollStudentInCourse(dc: DataConnect, vars: EnrollStudentInCourseVariables): MutationPromise<EnrollStudentInCourseData, EnrollStudentInCourseVariables>;

interface ListCoursesForStudentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListCoursesForStudentVariables): QueryRef<ListCoursesForStudentData, ListCoursesForStudentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListCoursesForStudentVariables): QueryRef<ListCoursesForStudentData, ListCoursesForStudentVariables>;
  operationName: string;
}
export const listCoursesForStudentRef: ListCoursesForStudentRef;

export function listCoursesForStudent(vars: ListCoursesForStudentVariables): QueryPromise<ListCoursesForStudentData, ListCoursesForStudentVariables>;
export function listCoursesForStudent(dc: DataConnect, vars: ListCoursesForStudentVariables): QueryPromise<ListCoursesForStudentData, ListCoursesForStudentVariables>;

