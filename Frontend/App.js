import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { auth, db } from './src/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import StudentHome from './src/screens/student/StudentHome';
import StudentRating from './src/screens/student/StudentRating';
import StudentTimetable from './src/screens/student/StudentTimetable';
import LecturerHome from './src/screens/lecturer/LecturerHome';
import LecturerReports from './src/screens/lecturer/LecturerReports';
import LecturerAttendance from './src/screens/lecturer/LecturerAttendance';
import PRLHome from './src/screens/prl/PRLHome';
import PRLCourses from './src/screens/prl/PRLCourses';
import PRLReviews from './src/screens/prl/PRLReviews';
import PLHome from './src/screens/pl/PLHome';
import PLCourses from './src/screens/pl/PLCourses';
import PLLecturers from './src/screens/pl/PLLecturers';
import PLReviews from './src/screens/pl/PLReviews';

import { COLORS } from './src/styles/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: 'home',
            Timetable: 'calendar',
            Ratings: 'star',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.navy,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 5,
        },
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={StudentHome} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Timetable" component={StudentTimetable} options={{ title: 'My Timetable' }} />
      <Tab.Screen name="Ratings" component={StudentRating} options={{ title: 'Rate Lecturers' }} />
    </Tab.Navigator>
  );
}

function LecturerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: 'home',
            Attendance: 'check-square',
            Reports: 'file-text',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.navy,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 5,
        },
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={LecturerHome} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Attendance" component={LecturerAttendance} options={{ title: 'Mark Attendance' }} />
      <Tab.Screen name="Reports" component={LecturerReports} options={{ title: 'Lecture Reports' }} />
    </Tab.Navigator>
  );
}

function PRLTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: 'home',
            Courses: 'book',
            Reviews: 'file-text',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.navy,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 5,
        },
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={PRLHome} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Courses" component={PRLCourses} options={{ title: 'Courses & Lecturers' }} />
      <Tab.Screen name="Reviews" component={PRLReviews} options={{ title: 'Report Reviews' }} />
    </Tab.Navigator>
  );
}

function PLTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: 'home',
            Courses: 'book',
            Lecturers: 'users',
            Reviews: 'file-text',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.navy,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 5,
        },
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={PLHome} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Courses" component={PLCourses} options={{ title: 'Course Management' }} />
      <Tab.Screen name="Lecturers" component={PLLecturers} options={{ title: 'Lecturers & Classes' }} />
      <Tab.Screen name="Reviews" component={PLReviews} options={{ title: 'Report Reviews' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(firebaseUser);
            setUserRole(userData?.role || 'student');
          } else {
            setUser(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.navy} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.navy },
          headerTintColor: COLORS.white,
          cardStyle: { backgroundColor: COLORS.white },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            {userRole === 'student' && (
              <Stack.Screen name="StudentMain" component={StudentTabs} options={{ headerShown: false }} />
            )}
            {userRole === 'lecturer' && (
              <Stack.Screen name="LecturerMain" component={LecturerTabs} options={{ headerShown: false }} />
            )}
            {userRole === 'prl' && (
              <Stack.Screen name="PRLMain" component={PRLTabs} options={{ headerShown: false }} />
            )}
            {userRole === 'pl' && (
              <Stack.Screen name="PLMain" component={PLTabs} options={{ headerShown: false }} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}