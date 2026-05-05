import React, { useState } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { 
  User as UserIcon, Mail, Phone, MapPin, 
  Camera, Save, Server, Shield, 
  Eye, EyeOff, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn, applyPhoneMask, hashPassword } from '../lib/utils';
import { compressImage } from '../lib/imageUtils';

interface UserProfileProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
}

export function UserProfile({ user, onUpdate }: UserProfileProps) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
  const [photo, setPhoto] = useState(user.profilePhoto || '');
  const [jobFunction, setJobFunction] = useState(user.jobFunction || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalDataUrl = reader.result as string;
          const compressedDataUrl = await compressImage(originalDataUrl, 300, 300, 0.7);
          setPhoto(compressedDataUrl);
        } catch (error) {
          console.error('Error processing image:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      alert('A nova senha e a confirmação não coincidem.');
      setIsSaving(false);
      return;
    }

    if (newPassword && !currentPassword) {
      alert('Por favor, informe a senha atual para alterar a senha.');
      setIsSaving(false);
      return;
    }

    let updatedPassword = user.password;

    if (newPassword) {
      const trimmedCurrent = currentPassword.trim();
      const hashedCurrent = await hashPassword(trimmedCurrent);
      const storedPassword = (user.password || '').trim();
      
      // If stored password doesn't look like a SHA-256 hash (64 chars),
      // allow direct comparison with plain trimmedCurrent.
      const isStoredHashed = storedPassword.length === 64 && /^[0-9a-f]+$/i.test(storedPassword);
      
      const isAuthenticated = isStoredHashed 
        ? hashedCurrent.toLowerCase() === storedPassword.toLowerCase() 
        : trimmedCurrent === storedPassword;

      if (!isAuthenticated) {
        alert('A senha atual está incorreta. Verifique se há espaços extras.');
        setIsSaving(false);
        return;
      }
      const trimmedNew = newPassword.trim();
      updatedPassword = await hashPassword(trimmedNew);
    }

    const updatedUser: User = {
      ...user,
      name,
      email,
      phone,
      address,
      jobFunction,
      profilePhoto: photo,
      password: updatedPassword
    };

    try {
      await onUpdate(updatedUser);
      setSaveSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erro ao salvar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Basic Info Card */}
        <Card className="flex-1 w-full border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-blue-600 text-white">
            <div className="flex items-center gap-3">
              <UserIcon className="w-6 h-6" />
              <div>
                <CardTitle>Perfil do Usuário</CardTitle>
                <CardDescription className="text-blue-100">Gerencie seus dados pessoais e contato</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-md flex items-center justify-center">
                  {photo ? (
                    <img src={photo} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-gray-300" />
                  )}
                </div>
                <label 
                  htmlFor="photo-upload" 
                  className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="name" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="pl-10"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job">Função / Cargo</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="job" 
                        value={jobFunction} 
                        onChange={e => setJobFunction(e.target.value)} 
                        className="pl-10"
                        placeholder="Ex: Engenheiro Civil, Gerente de Compras..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail Pessoal / Sistema</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        id="email" 
                        type="email"
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="pl-10"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={e => setPhone(applyPhoneMask(e.target.value))} 
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço / Localização</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    id="address" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    className="pl-10"
                    placeholder="Cidade, Estado"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mt-6">
        {/* Security / Password Card */}
        <Card className="flex-1 w-full border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-rose-600 text-white">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <div>
                <CardTitle>Segurança</CardTitle>
                <CardDescription className="text-rose-100">Altere sua senha de acesso ao sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pass">Senha Atual</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  id="current-pass" 
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  className="pl-10 pr-10"
                  placeholder="Sua senha atual"
                />
                <button 
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="new-pass">Nova Senha</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    id="new-pass" 
                    type={showNewPass ? "text" : "password"}
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="pl-10 pr-10"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button 
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pass">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    id="confirm-pass" 
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className="pl-10 pr-10"
                    placeholder="Repita a nova senha"
                  />
                  <button 
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            {newPassword && newPassword.length < 6 && (
              <p className="text-[10px] text-rose-500 font-medium">A senha deve ter pelo menos 6 caracteres.</p>
            )}
          </CardContent>
        </Card>
        <div className="flex-1" />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className={cn(
            "h-12 px-8 text-lg min-w-[200px] transition-all duration-300",
            saveSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {isSaving ? (
            "Salvando..."
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Salvo com Sucesso
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
