// Owner: Track B. Navigation = 5 sections (PLAN §5). TODO(B): port auth + SessionGuard from Internal_ai App.jsx.
import { Routes, Route, Navigate } from 'react-router';
import { ProfileProvider } from './a11y/ProfileProvider.jsx';
import { AnnouncerProvider } from './a11y/Announcer.jsx';
import Layout from './components/Layout.jsx';
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
        <Routes>
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
            <Route path="company" element={<Company />} />
            <Route path="insights" element={<Insights />} />
          </Route>
        </Routes>
      </AnnouncerProvider>
    </ProfileProvider>
  );
}
