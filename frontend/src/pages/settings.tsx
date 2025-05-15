import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, User, Bell, Shield } from 'lucide-react';
import { userService } from '../services/user.service';
import { getCompanySettings, updateCompanySettings } from '../services/settingsService';
import { toast } from '@/components/ui/use-toast';

const SettingsPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    company_address: '',
    company_email: '',
    phone_number: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCompanySettings().then(data => {
      setForm({
        company_name: data.company_name || '',
        company_address: data.company_address || '',
        company_email: data.company_email || '',
        phone_number: data.phone_number || ''
      });
    });
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMessage('');
    setPasswordChangeError('');
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await userService.changePassword(currentPassword, newPassword);
      setPasswordChangeMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordChangeError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCompanySettings(form);
      toast({ title: 'Settings updated', description: 'Company settings have been saved.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update settings.', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" name="company_name" value={form.company_name} onChange={handleChange} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-address">Company Address</Label>
                  <textarea id="company-address" name="company_address" value={form.company_address} onChange={handleChange} className="w-full border rounded p-2" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-email">Company Email</Label>
                  <Input id="company-email" name="company_email" type="email" value={form.company_email} onChange={handleChange} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <Input id="company-phone" name="phone_number" value={form.phone_number} onChange={handleChange} />
                </div>
              </div>
              
              
              
              <div className="pt-4 border-t flex justify-end">
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label>Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label>New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded p-2" />
                </div>
                <div>
                  <label>Confirm New Password</label>
                  <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full border rounded p-2" />
                </div>
                {passwordChangeError && <div className="text-red-500">{passwordChangeError}</div>}
                {passwordChangeMessage && <div className="text-green-600">{passwordChangeMessage}</div>}
                <button type="submit" className="bg-factory-primary text-white px-4 py-2 rounded" disabled={isChangingPassword}>
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
              
              
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
