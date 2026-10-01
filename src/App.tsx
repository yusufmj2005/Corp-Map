import { Route, BrowserRouter, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import CompanyPage from './pages/CompanyPage'
import ToolsPage from './pages/ToolsPage'
import BranchesToolPage from './pages/BranchesToolPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/company/:id" element={<CompanyPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tools/branches" element={<BranchesToolPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
