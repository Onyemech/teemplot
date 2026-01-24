import { useState, useEffect } from 'react';
import { Fingerprint, X, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { isBiometricAvailable } from '@/utils/pwa';
import Button from '@/components/ui/Button';

interface BiometricSetupPromptProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isMandatory?: boolean;
}

export default function BiometricSetupPrompt({
    isOpen,
    onClose,
    onSuccess,
    isMandatory = false
}: BiometricSetupPromptProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [supported, setSupported] = useState(false);
    const [step, setStep] = useState<'prompt' | 'registering' | 'success'>('prompt');

    useEffect(() => {
        isBiometricAvailable().then(setSupported);
    }, []);

    if (!isOpen) return null;

    const toBase64 = (buffer: ArrayBuffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    const bufferDecode = (value: string) => {
        if (!value) return new Uint8Array(0);
        return Uint8Array.from(atob(value.replace(/_/g, '/').replace(/-/g, '+')), c => c.charCodeAt(0));
    };

    const handleRegister = async () => {
        setLoading(true);
        setStep('registering');
        try {
            // 1. Get options from server
            const optionsRes = await apiClient.post('/api/webauthn/register/options');
            const data = optionsRes.data.data;
            const options = data.options;

            // 2. Decode options for WebAuthn API
            const publicKey: PublicKeyCredentialCreationOptions = {
                ...options,
                challenge: bufferDecode(options.challenge),
                user: {
                    ...options.user,
                    id: bufferDecode(options.user.id)
                },
                excludeCredentials: options.excludeCredentials?.map((cred: any) => ({
                    ...cred,
                    id: bufferDecode(cred.id)
                }))
            };

            // 3. Create credential
            const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
            const response = credential.response as AuthenticatorAttestationResponse;

            // 4. Verify with server
            const verifyRes = await apiClient.post('/api/webauthn/register/verify', {
                credentialId: credential.id,
                challengeId: data.challengeId, // Send back the original challenge ID
                response: {
                    id: credential.id,
                    rawId: toBase64(credential.rawId),
                    type: credential.type,
                    response: {
                        attestationObject: toBase64(response.attestationObject),
                        clientDataJSON: toBase64(response.clientDataJSON),
                        transports: response.getTransports ? response.getTransports() : []
                    }
                }
            });

            if (verifyRes.data.success) {
                setStep('success');
                toast.success('Biometrics registered successfully');
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }
        } catch (error: any) {
            console.error('Biometric registration failed:', error);
            
            // Handle specific WebAuthn errors
            if (error.name === 'NotAllowedError') {
                toast.error('Registration was cancelled or timed out. Please try again.');
            } else if (error.name === 'NotSupportedError') {
                toast.error('Biometrics not supported on this browser or device.');
            } else {
                toast.error(error.response?.data?.message || error.message || 'Registration failed');
            }
            setStep('prompt');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        sessionStorage.setItem('skip_biometric_setup', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isMandatory ? 'bg-red-50' : 'bg-[#E0F2F1]'}`}>
                            {isMandatory ? <ShieldAlert className="w-5 h-5 text-red-600" /> : <Fingerprint className="w-5 h-5 text-[#0F5D5D]" />}
                        </div>
                        <h3 className="font-semibold text-gray-900">Biometric Setup</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    {step === 'prompt' && (
                        <>
                            <div className="mb-6 flex justify-center">
                                <div className="w-20 h-20 bg-[#F0FDF4] rounded-full flex items-center justify-center">
                                    <Fingerprint className="w-10 h-10 text-[#0F5D5D]" />
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">Secure Your Account</h4>
                            <p className="text-gray-500 mb-6">
                                {isMandatory
                                    ? "Your company requires biometric verification for clocking in/out. Please set it up on your device."
                                    : "Enable biometric login for faster and more secure access."
                                }
                            </p>

                            <div className="space-y-3">
                                <Button
                                    onClick={handleRegister}
                                    fullWidth
                                    size="lg"
                                    disabled={!supported}
                                    loading={loading}
                                >
                                    {supported ? 'Setup Biometrics' : 'Device Not Supported'}
                                </Button>

                                <button 
                                    onClick={handleSkip}
                                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                                >
                                    Skip for now
                                </button>
                            </div>

                            {!supported && (
                                <p className="mt-4 text-xs text-red-500 bg-red-50 p-2 rounded-lg">
                                    Your device or browser does not support WebAuthn biometrics (Face ID/Fingerprint). If you're on a desktop, ensure your hardware supports Windows Hello or Touch ID.
                                </p>
                            )}
                        </>
                    )}

                    {step === 'registering' && (
                        <div className="py-8">
                            <Loader2 className="w-12 h-12 text-[#0F5D5D] animate-spin mx-auto mb-4" />
                            <p className="font-medium text-gray-900">Verifying...</p>
                            <p className="text-sm text-gray-500 mt-1">Please follow your device prompts</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="py-8">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-in zoom-in" />
                            <h4 className="text-lg font-bold text-gray-900">Setup Complete!</h4>
                            <p className="text-sm text-gray-500 mt-1">You can now use biometrics to log in and clock in.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
