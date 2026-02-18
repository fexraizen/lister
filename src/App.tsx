import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { CreateListingPage } from './pages/CreateListingPage';
import { MyListingsPage } from './pages/MyListingsPage';
import { WalletPage } from './pages/WalletPage';
import { AdminPage } from './pages/AdminPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { CategoryPage } from './pages/CategoryPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { ShopCreatePage } from './pages/ShopCreatePage';
import { ShopManagePage } from './pages/ShopManagePage';
import { ShopEditPage } from './pages/ShopEditPage';
import { ShopListingsPage } from './pages/ShopListingsPage';
import { ListingEditPage } from './pages/ListingEditPage';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Admin Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/listing/:id" element={<ListingDetailPage />} />
      <Route
        path="/listing/:id/edit"
        element={
          <ProtectedRoute>
            <ListingEditPage />
          </ProtectedRoute>
        }
      />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <ProfileEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shop/create"
        element={
          <ProtectedRoute>
            <ShopCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shop/manage"
        element={
          <ProtectedRoute>
            <ShopManagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shop/:id/edit"
        element={
          <ProtectedRoute>
            <ShopEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shop/:id/listings"
        element={
          <ProtectedRoute>
            <ShopListingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/listings/new"
        element={
          <ProtectedRoute>
            <CreateListingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-listings"
        element={
          <ProtectedRoute>
            <MyListingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
