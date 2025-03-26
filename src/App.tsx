import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import GroupProfile from './pages/GroupProfile';
import { LazyLoadedComponent } from './components/LazyLoadedComponent';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Route par défaut vers Home */}
          <Route path="/" element={<Home />} />
          
          {/* Routes d'authentification */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Routes protégées */}
          <Route 
            path="/chat" 
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/group-profile" 
            element={
              <PrivateRoute>
                <GroupProfile 
                  group={{ id: '', name: '', members: [], created_by: '' }} // Provide a default group object
                  onlineUsers={new Set()} // Provide an empty Set for online users
                  onClose={() => console.log('GroupProfile closed')} // Provide a default onClose handler
                />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/lazy" 
            element={
              <PrivateRoute>
                <LazyLoadedComponent />
              </PrivateRoute>
            } 
          />
          
          {/* Redirection vers Home pour les routes inconnues */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
