# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { addNewUser, getUserByEmail, enrollStudentInCourse, listCoursesForStudent } from '@dataconnect/generated';


// Operation AddNewUser:  For variables, look at type AddNewUserVars in ../index.d.ts
const { data } = await AddNewUser(dataConnect, addNewUserVars);

// Operation GetUserByEmail:  For variables, look at type GetUserByEmailVars in ../index.d.ts
const { data } = await GetUserByEmail(dataConnect, getUserByEmailVars);

// Operation EnrollStudentInCourse:  For variables, look at type EnrollStudentInCourseVars in ../index.d.ts
const { data } = await EnrollStudentInCourse(dataConnect, enrollStudentInCourseVars);

// Operation ListCoursesForStudent:  For variables, look at type ListCoursesForStudentVars in ../index.d.ts
const { data } = await ListCoursesForStudent(dataConnect, listCoursesForStudentVars);


```