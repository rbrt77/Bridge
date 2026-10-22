// Owner: Track B. Navigation = 5 sections (PLAN §5). Everything except /login sits behind SessionGuard.
import { Routes, Route, Navigate } from 'react-router';
import { ProfileProvider } from './a11y/ProfileProvider.jsx';
import { AnnouncerProvider } from './a11y/Announcer.jsx';
import { SessionProvider, SessionGuard } from './auth/Session.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Today from './pages/Today.jsx';
import Ask from './pages/Ask.jsx';
import Tickets from './pages/Tickets.jsx';
import Reviews from './pages/Reviews.jsx';
import Setup from './pages/Setup.jsx';
import Meetings from './pages/Meetings.jsx';
import Support from './pages/Support.jsx';
import WorkStyle from './pages/WorkStyle.jsx';
import Glossary from './pages/Glossary.jsx';
import AboutAi from './pages/AboutAi.jsx';
import Company from './pages/Company.jsx';
import Insights from './pages/Insights.jsx';

export default function App() {
  return (
    <ProfileProvider>
      <AnnouncerProvider>
        <SessionProvider>
          <Routes>
            <Route path="login" element={<Login />} />
            <Route element={<SessionGuard />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/today" replace />} />
                <Route path="today" element={<Today />} />
                <Route path="ask" element={<Ask />} />
                <Route path="work" element={<Navigate to="/work/tickets" replace />} />
                <Route path="work/tickets" element={<Tickets />} />
                <Route path="work/reviews" element={<Reviews />} />
                <Route path="work/setup" element={<Setup />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="support" element={<Support />} />
                <Route path="work-style" element={<WorkStyle />} />
                <Route path="glossary" element={<Glossary />} />
                <Route path="about-ai" element={<AboutAi />} />
                <Route element={<SessionGuard roles={['manager', 'admin']} />}>
                  <Route path="insights" element={<Insights />} />
                </Route>
                <Route element={<SessionGuard roles={['admin']} />}>
                  <Route path="company" element={<Company />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </SessionProvider>
      </AnnouncerProvider>
    </ProfileProvider>
  );
}
