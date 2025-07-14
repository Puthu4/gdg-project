import { firebaseConfig } from './firebase-config';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot, // Using onSnapshot for real-time updates
  query,
  doc,
  setDoc,
  addDoc, // Import addDoc for adding new documents
  deleteDoc
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';

// Ensure Tailwind CSS is loaded for styling
// Note: Tailwind classes are used directly in JSX, no separate CSS file needed.

function App() {
  // Firebase and Auth states
  const [app, setApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // To track if authentication is complete

  // Application data states
  const [events, setEvents] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState(null);
  const [addEventStatus, setAddEventStatus] = useState(''); // To show status of adding event

  // State to track if GDG Hackathon 2025 is already in DB
  const [isGdgHackathonAlreadyInDb, setIsGdgHackathonAlreadyInDb] = useState(false);

  // New state for scroll position to control card background
  const [scrollPosition, setScrollPosition] = useState(0);

  // Debugging log for initial render state
  console.log("App render - isGdgHackathonAlreadyInDb:", isGdgHackathonAlreadyInDb);

  // Initialize Firebase and handle authentication
  useEffect(() => {
    try {
    
      // Initialize Firebase app if not already initialized
      const firebaseApp = initializeApp(firebaseConfig);
      setApp(firebaseApp);
      const firestoreDb = getFirestore(firebaseApp);
      setDb(firestoreDb);
      const firebaseAuth = getAuth(firebaseApp);
      setAuth(firebaseAuth);

      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          // User is signed in
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          // User is signed out or not yet authenticated
          // Use the custom token if available, otherwise sign in anonymously
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
              await signInWithCustomToken(firebaseAuth, __initial_auth_token);
            } catch (error) {
              console.error("Error signing in with custom token:", error);
              // Fallback to anonymous sign-in if custom token fails
              await signInAnonymously(firebaseAuth);
            }
          } else {
            await signInAnonymously(firebaseAuth);
          }
          setIsAuthReady(true); // Mark auth as ready after initial check/sign-in
        }
      });

      // Cleanup subscription on component unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
    /*
     * Google Technologies Used in this Project:
     *
     * 1. Firebase (Authentication and Cloud Firestore):
     * - Firebase Authentication is actively used for user management (anonymous sign-in and custom token sign-in).
     * - Cloud Firestore is used as the real-time database to store and manage event data.
     * These are direct, integrated Google technologies within the application's code.
     *
     * 2. IDX (Integrated Development Experience):
     * - While "IDX" is not a specific code library to import, this project leverages Google's commitment to an
     * excellent Integrated Development Experience (IDX) by utilizing the Firebase SDKs and the cohesive Firebase
     * ecosystem for backend services. The ease of integration and comprehensive tools provided by Firebase
     * embody Google's focus on developer experience.
     *
     * 3. Firebase Studio (Firebase Console):
     * - "Firebase Studio" refers to the Firebase Console, which is the web-based management interface provided by Google.
     * - This project is configured, managed (e.g., database rules, authentication methods), and monitored
     * through the Firebase Console, which is a key Google technology used *alongside* the development.
     * - It's not code directly integrated into the React app, but it's essential for the project's setup and operation.
     */
  }, []); // Empty dependency array means this runs only once on mount

  // Fetch events in real-time using onSnapshot
  useEffect(() => {
    // Ensure db and userId are available and authentication is ready before fetching data
    if (db && userId && isAuthReady) {
      // Define the app ID from the global variable or a default
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      // Construct the collection path for public data
      const eventsCollectionRef = collection(db, `artifacts/${appId}/public/data/events`);

      // Set up a real-time listener for events
      const unsubscribe = onSnapshot(eventsCollectionRef, (snapshot) => {
        const eventList = snapshot.docs.map(doc => ({
          id: doc.id, // Include document ID for potential future operations (e.g., delete)
          ...doc.data()
        }));
        setEvents(eventList);
      }, (error) => {
        console.error("Error fetching events:", error);
      });

      // Cleanup the listener when the component unmounts or dependencies change
      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady]); // Re-run when db, userId, or auth readiness changes

  // Effect to check if GDG Hackathon 2025 is already in the database
  useEffect(() => {
    const gdgEventExists = events.some(event => event.title === "GDG Hackathon 2025");
    setIsGdgHackathonAlreadyInDb(gdgEventExists);
    if (gdgEventExists) {
      setAddEventStatus("The 'GDG Hackathon 2025' event is already listed!");
    } else {
      // Clear status if event is not found (e.g., after manual deletion from console)
      setAddEventStatus("");
    }
  }, [events]); // Re-run whenever the events list changes

  // Function to add a sample event (GDG Hackathon 2025) to Firestore
  const addSampleEvent = async () => {
    console.log("Attempting to add GDG Hackathon 2025..."); // Debugging log
    if (!db || !userId) {
      setAddEventStatus("Error: Database not initialized or user not authenticated.");
      console.error("addSampleEvent: DB not ready or user not authenticated."); // Debugging log
      return;
    }
    if (isGdgHackathonAlreadyInDb) {
      setAddEventStatus("Event 'GDG Hackathon 2025' is already added.");
      console.log("addSampleEvent: Event already in DB, not adding again."); // Debugging log
      return;
    }

    setAddEventStatus("Adding event...");
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const eventsCollectionRef = collection(db, `artifacts/${appId}/public/data/events`);

      await addDoc(eventsCollectionRef, {
        title: "GDG Hackathon 2025",
        date: "October 26, 2025",
        mode: "Hybrid",
        description: "Annual hackathon for developers, organized by Google Developer Groups.",
        location: "#67, BGS Health & Education City, Uttarahalli Road, Kengeri, Bangalore - 560060, Karnataka, India", // Updated location
        coordinates: { lat: 12.8988, lng: 77.5029 } // Still using approximate coordinates for SJBIT
      });
      setAddEventStatus("Event 'GDG Hackathon 2025' added successfully!");
      setIsGdgHackathonAlreadyInDb(true); // Mark as added
      console.log("GDG Hackathon 2025 added successfully!"); // Debugging log
    } catch (error) {
      console.error("Error adding sample event:", error);
      setAddEventStatus(`Failed to add event: ${error.message}`);
    }
  };

  // Function to generate Google Calendar URL
  const getGoogleCalendarUrl = (event) => {
    const startDate = new Date(event.date);
    // For simplicity, assuming a 2-hour event from 10 AM to 12 PM on the event date
    const startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 10, 0, 0);
    const endDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0);

    const formatDateTime = (date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, ''); // Format to YYYYMMDDTHHMMSSZ
    };

    const dates = `${formatDateTime(startDateTime)}/${formatDateTime(endDateTime)}`;
    const text = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location || '');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&sf=true&output=xml`;
  };

  // Function to generate Google Maps URL
  const getGoogleMapsUrl = (event) => {
    if (event.coordinates && event.coordinates.lat && event.coordinates.lng) {
      // Use coordinates for precise map marker
      return `https://www.google.com/maps/search/?api=1&query=${event.coordinates.lat},${event.coordinates.lng}`;
    } else if (event.location) {
      // Fallback to location string if coordinates are not available
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
    }
    return '#'; // Fallback if no location data
  };

  // Function to ask Gemini
  const askGemini = async () => {
    if (!chatInput.trim()) {
      setChatResponse("Please enter a question.");
      return;
    }

    setLoadingGemini(true);
    setGeminiError(null);
    setChatResponse(''); // Clear previous response

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: chatInput }] });

      const payload = { contents: chatHistory };
      const apiKey = ""; // Canvas provides the API key at runtime for gemini-2.0-flash
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setChatResponse(text);
      } else {
        setChatResponse("No valid response from Gemini.");
      }
    } catch (error) {
      console.error("Error asking Gemini:", error);
      setGeminiError(`Failed to get response: ${error.message}`);
      setChatResponse("Error communicating with Gemini.");
    } finally {
      setLoadingGemini(false);
    }
  };

  // Effect to handle scroll event for card background change
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // Empty dependency array means this runs only once on mount

  // Dynamic gradient function with purple/magenta/pink shades
  const getMainCardBgClasses = () => {
    if (scrollPosition < 100) {
      // Deep purple to vibrant fuchsia/magenta
      return 'bg-gradient-to-br from-purple-900 to-fuchsia-700';
    } else if (scrollPosition >= 100 && scrollPosition < 300) {
      // Slightly lighter purple to brighter pink
      return 'bg-gradient-to-br from-purple-700 via-pink-600 to-fuchsia-500';
    } else {
      // Even lighter, more pink-dominant blend
      return 'bg-gradient-to-br from-pink-400 via-fuchsia-300 to-rose-200';
    }
  };

  return (
    // Main container with Tailwind classes for responsive layout, font, and background
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-4 font-inter">
      {/* Main content container with trendy UI - now dynamic gradient */}
      <div className={`${getMainCardBgClasses()} rounded-3xl shadow-2xl p-8 max-w-4xl w-full space-y-8 transform transition-all duration-1000 ease-in-out hover:scale-[1.01] hover:shadow-3xl border border-gray-100`}>
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-5xl font-extrabold text-center text-white drop-shadow-lg"> {/* Changed text color to white */}
            SJBIT GDG UPDATES
          </h1>
        </div>

        {/* Loading/Auth Status */}
        {!isAuthReady ? (
          <div className="text-center text-gray-600">
            <p className="text-lg">Loading application and authenticating...</p>
            <div className="animate-bounce rounded-full h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-6"></div>
          </div>
        ) : (
          <>
            {/* Welcome message and User ID */}
            {userId && (
              <div className="text-center text-gray-700 text-lg mb-6 p-4 bg-blue-50 rounded-xl shadow-inner">
                <p className="font-semibold text-blue-800">Welcome! Your User ID:</p>
                <p className="text-sm break-all bg-blue-100 p-2 rounded-md inline-block mt-2 font-mono text-blue-700 select-all transition-all duration-300 hover:bg-blue-200 cursor-pointer"
                   onClick={() => {
                     // Copy userId to clipboard (fallback for iframe)
                     const el = document.createElement('textarea');
                     el.value = userId;
                     document.body.appendChild(el);
                     el.select();
                     document.execCommand('copy');
                     document.body.removeChild(el);
                     // Optional: Add a visual feedback for copy
                     alert('User ID copied to clipboard!'); // Using alert for simplicity, would use custom modal in production
                   }}
                   title="Click to copy User ID"
                >
                  {userId}
                </p>
              </div>
            )}

            {/* Upcoming Events Section */}
            <div className="bg-gradient-to-br from-indigo-200 via-sky-200 to-emerald-200 p-6 rounded-2xl shadow-xl border border-indigo-200 transition-all duration-700 hover:shadow-2xl hover:border-sky-300">
              <h3 className="text-3xl font-bold text-indigo-800 mb-5 flex items-center">
                <svg className="w-8 h-8 mr-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path></svg>
                Upcoming Events
              </h3>
              {events.length === 0 ? (
                <p className="text-gray-600 text-center py-4 bg-white rounded-lg shadow-sm">
                  No exciting events found yet. Stay tuned or add some!
                </p>
              ) : (
                <ul className="space-y-4">
                  {events.map((event, index) => (
                    <li key={event.id || index} className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-blue-300 cursor-pointer">
                      <div>
                        <strong className="text-xl text-gray-900">{event.title}</strong>
                        <p className="text-gray-600 text-base mt-1">
                          🗓️ {event.date} - <span className="font-semibold text-purple-600">{event.mode}</span>
                          {event.location && (
                            <span className="text-gray-500 text-sm block mt-1">📍 {event.location}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                        {event.location && (
                          <a
                            href={getGoogleMapsUrl(event)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 shadow-md text-sm flex items-center justify-center"
                            title="View on Map" // Added title for accessibility
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                          </a>
                        )}
                        <a
                          href={getGoogleCalendarUrl(event)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition duration-300 shadow-md text-sm flex items-center justify-center"
                          title="Add to Calendar" // Added title for accessibility
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path></svg>
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {/* Button to add sample event */}
              <div className="mt-6 text-center">
                <button
                  onClick={addSampleEvent}
                  className="px-6 py-3 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!db || !userId || isGdgHackathonAlreadyInDb} // Disable if Firebase not ready OR event is already in DB
                >
                  {isGdgHackathonAlreadyInDb ? "GDG Hackathon 2025 Already Added" : "Add 'GDG Hackathon 2025'"}
                </button>
                {addEventStatus && <p className="mt-2 text-sm text-gray-600">{addEventStatus}</p>}
              </div>
            </div>

            {/* Ask Gemini Section */}
            <div className="mt-8 bg-gradient-to-br from-purple-200 via-pink-200 to-red-200 p-6 rounded-2xl shadow-xl border border-purple-200 transition-all duration-700 hover:shadow-2xl hover:border-pink-300">
              <h3 className="text-3xl font-bold text-purple-800 mb-5 flex items-center">
                <svg className="w-8 h-8 mr-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M18 9v2a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1h14a1 1 0 011 1zM3 13h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1 1 0 011-1zM3 5h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z"></path></svg>
                Ask Gemini
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about events, tech stacks, campus life, or anything!"
                  className="flex-grow p-4 border border-purple-300 rounded-lg focus:ring-4 focus:ring-purple-400 focus:border-purple-500 outline-none transition-all duration-300 shadow-sm text-lg hover:border-purple-400"
                />
                <button
                  onClick={askGemini}
                  disabled={loadingGemini}
                  className="px-7 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75"
                >
                  {loadingGemini ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Asking...
                    </div>
                  ) : 'Ask'}
                </button>
              </div>
              {geminiError && (
                <p className="text-red-600 text-sm mt-3 p-2 bg-red-50 rounded-md border border-red-200">{geminiError}</p>
              )}
              <div className="mt-5 p-5 bg-white rounded-xl shadow-md border border-purple-200 min-h-[80px] flex items-center">
                <p className="font-semibold text-purple-800 mr-2">Gemini:</p>
                <p className="text-gray-700 text-base flex-grow">
                  {chatResponse || (loadingGemini ? 'Thinking...' : 'Waiting for your question...')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;