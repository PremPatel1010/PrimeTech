
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <AlertTriangle className="h-24 w-24 text-factory-warning" />
        </div>
        <h1 className="text-6xl font-bold mb-4 text-factory-primary">404</h1>
        <p className="text-xl text-factory-gray-600 mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Button className="bg-factory-primary hover:bg-factory-primary/90" size="lg" asChild>
          <a href="/">Return to Dashboard</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
