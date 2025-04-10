# ChatFrar

ChatFrar is a modern, real-time chat application designed for seamless communication. It supports private and group chats, AI-powered assistance, and a secure, user-friendly interface.

---

## Table of Contents

1. [Technologies Used](#technologies-used)
2. [Project Structure](#project-structure)
3. [Database Design](#database-design)
4. [AI Support](#ai-support)
5. [User Scenarios](#user-scenarios)
6. [Getting Started](#getting-started)
7. [Contributing](#contributing)
8. [License](#license)

---

## Technologies Used

### Frontend
- **Framework**: [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth animations
- **Routing**: [React Router](https://reactrouter.com/)
- **State Management**: Context API
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Languages**: JavaScript, TypeScript, HTML, CSS

### Backend
- **Framework**: [Express.js](https://expressjs.com/) with Node.js
- **Database**: [MySQL](https://www.mysql.com/) (via Supabase for hosted database management)
- **Authentication**: Supabase Auth with JWT
- **File Uploads**: [Multer](https://github.com/expressjs/multer) for handling media uploads
- **Real-Time Communication**: [Socket.IO](https://socket.io/)
- **Languages**: JavaScript, Node.js

### AI Support
- **AI Model**: Gemini AI powered by [Google Generative AI](https://ai.google/tools/)
- **Integration**: Custom API for AI responses
- **Languages**: Python, JavaScript

### Testing
- **Unit Testing**: Jest for unit testing
- **Integration Testing**: Cypress for integration testing
- **End-to-End Testing**: Cypress for end-to-end testing

### Deployment
- **Platform**: [Vercel](https://vercel.com/) for frontend deployment
- **Platform**: [Heroku](https://www.heroku.com/) for backend deployment

---

## Project Structure

```bash
chatfrar/
├── backend/                # Backend server
│   ├── src/
│   │   ├── routes/         # API routes (auth, messages, groups)
│   │   ├── models/         # Database models
│   │   ├── config/         # Database and environment configuration
│   │   ├── socket.js       # Socket.IO setup
│   │   └── index.js        # Main server entry point
├── src/                    # Frontend application
│   ├── components/         # Reusable UI components
│   ├── contexts/           # Context API for global state
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Application pages (Chat, Profile, etc.)
│   ├── services/           # API and socket services
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Frontend entry point
├── supabase/               # Supabase migrations and SQL scripts
│   ├── migrations/         # Database schema and policies
├── .env                    # Environment variables
├── package.json            # Project dependencies and scripts
├── vite.config.ts          # Vite configuration
└── README.md               # Project documentation
```

---

## Database Design

The database is hosted on **Supabase** and uses **MySQL**. Below are the key tables:

### Tables
1. **Users**
   - Stores user information (e.g., username, email, avatar).
   - Authentication is handled via Supabase Auth.

2. **Groups**
   - Stores group chat information.
   - Includes group metadata like creator and members.

3. **Messages**
   - Stores chat messages.
   - Supports text, images, and replies.

4. **Group Members**
   - Tracks users in groups and their roles (e.g., admin).

5. **Group Bans**
   - Tracks banned members and reasons for bans.

### Policies
- **Row-Level Security (RLS)** is enabled for all tables.
- Policies ensure only authenticated users can access or modify their data.

---

## AI Support

ChatFrar integrates **Gemini AI** for intelligent responses. Users can interact with the AI by mentioning `@gemini` in their messages. The AI provides:
- Context-aware responses
- Assistance with queries
- Suggestions for group discussions

---

## User Scenarios

### 1. **User Registration and Login**
- **Scenario**: A new user signs up with their email, username, and password.
- **Steps**:
  1. Navigate to the signup page.
  2. Enter email, username, and password.
  3. Submit the form to create an account.
  4. Log in using the registered credentials.

### 2. **Private Messaging**
- **Scenario**: A user wants to chat with a friend.
- **Steps**:
  1. Search for the friend's username in the sidebar.
  2. Select the friend to open a chat.
  3. Send messages, images, or emojis.

### 3. **Group Chat**
- **Scenario**: A user creates a group for team collaboration.
- **Steps**:
  1. Click the "+" button in the sidebar.
  2. Enter a group name and select members.
  3. Start chatting in the group.

### 4. **AI Assistance**
- **Scenario**: A user asks Gemini AI for help.
- **Steps**:
  1. Mention `@gemini` in a message.
  2. Wait for the AI to respond with suggestions or answers.

### 5. **Profile Management**
- **Scenario**: A user updates their profile information.
- **Steps**:
  1. Navigate to the profile page.
  2. Edit username, email, or avatar.
  3. Save changes.

### 6. **Real-Time Notifications**
- **Scenario**: A user receives a new message.
- **Steps**:
  1. The sidebar shows unread message counts.
  2. Notifications appear for new messages.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL database (or Supabase account)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/chatfrar.git
   cd chatfrar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the environment variables:
   - Create a `.env` file in the root directory.
   - Add the following variables:
     ```env
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     VITE_GEMINI_API_KEY=your_gemini_api_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Start the backend server:
   ```bash
   cd backend
   npm install
   npm start
   ```

---

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

---

## License

This project is licensed under the MIT License.
