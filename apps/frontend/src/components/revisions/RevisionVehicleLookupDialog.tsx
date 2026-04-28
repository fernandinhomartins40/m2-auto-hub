import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Car,
  CheckCircle2,
  Loader2,
  Nfc,
  RefreshCcw,
  ScanLine,
  Search,
  Smartphone,
  User,
} from 'lucide-react';
import adminService, {
  AdminCustomerVehicle,
  ProvisionalUser,
  RecognizedPlateCandidate,
  VehicleLookupResult,
} from '@/api/adminService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitleRow,
} from '@/components/ui/responsive-dialog';
import { CreateCustomerModal } from '@/components/admin/CreateCustomerModal';
import { CreateVehicleModal } from '@/components/admin/CreateVehicleModal';
import { useToast } from '@/hooks/use-toast';
import {
  extractPlateFromNfcPayload,
  formatPlate,
  getPossibleBrazilianPlates,
  isValidBrazilianPlate,
  normalizePlate,
} from '@/utils/licensePlate';

type LookupMode = 'camera' | 'nfc';
type CaptureMode = 'guide' | 'full';
type LookupStep = 'scan' | 'result';
type LookupSource = 'camera' | 'nfc' | 'manual' | null;

interface RevisionLookupCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
}

interface RevisionLookupVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  mileage?: number;
}

interface RevisionVehicleLookupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved: (payload: {
    customer: RevisionLookupCustomer;
    vehicle: RevisionLookupVehicle;
  }) => void;
}

const AUTO_SCAN_INTERVAL_MS = 650;
const AUTO_SCAN_RETRY_MS = 1200;
const AUTO_SCAN_HISTORY_SIZE = 5;
const AUTO_SCAN_CONFIRMATIONS_REQUIRED = 3;
const AUTO_SCAN_MIN_CONFIDENCE = 0.72;
const AUTO_SCAN_GUIDE = {
  left: 0.12,
  top: 0.34,
  width: 0.76,
  height: 0.32,
};

const mapCustomer = (customer: ProvisionalUser): RevisionLookupCustomer => ({
  id: customer.id,
  name: customer.name,
  email: customer.email,
  phone: customer.whatsapp,
  cpf: customer.cpf,
});

const mapVehicle = (vehicle: AdminCustomerVehicle): RevisionLookupVehicle => ({
  id: vehicle.id,
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year,
  plate: vehicle.plate,
  color: vehicle.color,
  mileage: vehicle.mileage ?? undefined,
});

const readNdefRecordText = (record: any): string => {
  const decoder = new TextDecoder(record.encoding || 'utf-8');
  const rawData = record.data;

  if (rawData instanceof DataView) {
    return decoder.decode(rawData);
  }

  if (rawData instanceof ArrayBuffer) {
    return decoder.decode(new DataView(rawData));
  }

  if (ArrayBuffer.isView(rawData)) {
    return decoder.decode(rawData);
  }

  return '';
};

const normalizeCandidates = (candidates: RecognizedPlateCandidate[]) =>
  candidates
    .flatMap((candidate) =>
      getPossibleBrazilianPlates(candidate.plate).map((plate) => ({
        ...candidate,
        plate,
      }))
    )
    .filter((candidate) => isValidBrazilianPlate(candidate.plate))
    .sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }

      return right.detectionConfidence - left.detectionConfidence;
    });

const getCaptureRect = (
  videoWidth: number,
  videoHeight: number,
  captureMode: CaptureMode
) => {
  if (captureMode === 'full') {
    return {
      sx: 0,
      sy: 0,
      sw: videoWidth,
      sh: videoHeight,
    };
  }

  const guideLeft = videoWidth * AUTO_SCAN_GUIDE.left;
  const guideTop = videoHeight * AUTO_SCAN_GUIDE.top;
  const guideWidth = videoWidth * AUTO_SCAN_GUIDE.width;
  const guideHeight = videoHeight * AUTO_SCAN_GUIDE.height;

  const expandX = guideWidth * 0.08;
  const expandY = guideHeight * 0.45;

  const sx = Math.max(0, Math.floor(guideLeft - expandX));
  const sy = Math.max(0, Math.floor(guideTop - expandY));
  const sw = Math.min(videoWidth - sx, Math.ceil(guideWidth + expandX * 2));
  const sh = Math.min(videoHeight - sy, Math.ceil(guideHeight + expandY * 2));

  return { sx, sy, sw, sh };
};

export function RevisionVehicleLookupDialog({
  isOpen,
  onClose,
  onResolved,
}: RevisionVehicleLookupDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nfcAbortControllerRef = useRef<AbortController | null>(null);
  const autoScanTimeoutRef = useRef<number | null>(null);
  const autoScanInFlightRef = useRef(false);
  const autoScanAttemptRef = useRef(0);
  const recognitionHistoryRef = useRef<Array<{ plate: string; confidence: number }>>([]);
  const pendingLookupPlateRef = useRef<string | null>(null);

  const [mode, setMode] = useState<LookupMode>('camera');
  const [currentStep, setCurrentStep] = useState<LookupStep>('scan');
  const [resultSource, setResultSource] = useState<LookupSource>(null);
  const [manualPlate, setManualPlate] = useState('');
  const [recognizedCandidates, setRecognizedCandidates] = useState<RecognizedPlateCandidate[]>([]);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [autoScanStatus, setAutoScanStatus] = useState('Aponte a camera para a placa para iniciar a leitura automatica.');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcStatus, setNfcStatus] = useState<string | null>(null);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<VehicleLookupResult | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<ProvisionalUser | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<ProvisionalUser[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createVehicleOpen, setCreateVehicleOpen] = useState(false);

  const resolvedPlate = useMemo(
    () => lookupResult?.plate || normalizePlate(manualPlate),
    [lookupResult?.plate, manualPlate]
  );
  const isCameraScanStep = currentStep === 'scan' && mode === 'camera';

  const clearAutoScanTimer = () => {
    if (autoScanTimeoutRef.current !== null) {
      window.clearTimeout(autoScanTimeoutRef.current);
      autoScanTimeoutRef.current = null;
    }
  };

  const resetRecognitionHistory = () => {
    recognitionHistoryRef.current = [];
    autoScanAttemptRef.current = 0;
    pendingLookupPlateRef.current = null;
  };

  const openResultStep = (source: Exclude<LookupSource, null>) => {
    setCurrentStep('result');
    setResultSource(source);
    stopCamera();
    stopNfcScan();
  };

  const returnToScanStep = () => {
    setCurrentStep('scan');
    setResultSource(null);
    setLookupResult(null);
    setLookupLoading(false);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setRecognizedCandidates([]);
    setManualPlate('');
    setMode('camera');
    setAutoScanEnabled(true);
    setAutoScanStatus('Aponte a camera para a placa para iniciar a leitura automatica.');
  };

  const stopCamera = () => {
    clearAutoScanTimer();
    autoScanInFlightRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const stopNfcScan = () => {
    nfcAbortControllerRef.current?.abort();
    nfcAbortControllerRef.current = null;
    setNfcScanning(false);
  };

  const resetState = () => {
    setMode('camera');
    setCurrentStep('scan');
    setResultSource(null);
    setManualPlate('');
    setRecognizedCandidates([]);
    setCapturedPreview(null);
    setCameraError(null);
    setAutoScanEnabled(true);
    setAutoScanStatus('Aponte a camera para a placa para iniciar a leitura automatica.');
    setNfcStatus(null);
    setLookupResult(null);
    setLookupLoading(false);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
    setCreateCustomerOpen(false);
    setCreateVehicleOpen(false);
    resetRecognitionHistory();
  };

  useEffect(() => {
    setNfcSupported(typeof window !== 'undefined' && 'NDEFReader' in window);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      stopNfcScan();
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopNfcScan();
    };
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('A câmera não está disponível neste navegador.');
      return;
    }

    try {
      stopCamera();
      setCameraError(null);
      setCapturedPreview(null);
      setRecognizedCandidates([]);
      setLookupResult(null);
      setManualPlate('');
      setAutoScanStatus('Abrindo camera para leitura automatica...');
      resetRecognitionHistory();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setAutoScanStatus('Leitura automatica ativa. Mantenha a placa dentro da guia.');
    } catch (error) {
      console.error('Erro ao iniciar câmera:', error);
      setCameraError('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
      setCameraReady(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (currentStep === 'scan' && mode === 'camera') {
      startCamera();
      stopNfcScan();
      return;
    }

    stopCamera();
  }, [isOpen, mode, currentStep]);

  useEffect(() => {
    clearAutoScanTimer();

    if (
      !isOpen ||
      currentStep !== 'scan' ||
      mode !== 'camera' ||
      !autoScanEnabled ||
      !cameraReady ||
      lookupLoading ||
      Boolean(lookupResult) ||
      createCustomerOpen ||
      createVehicleOpen
    ) {
      return;
    }

    const delay =
      autoScanStatus === 'Falha temporaria na leitura automatica. Tentando novamente...'
        ? AUTO_SCAN_RETRY_MS
        : AUTO_SCAN_INTERVAL_MS;

    autoScanTimeoutRef.current = window.setTimeout(() => {
      void runAutoScan();
    }, delay);

    return () => clearAutoScanTimer();
  }, [
    isOpen,
    currentStep,
    mode,
    autoScanEnabled,
    cameraReady,
    lookupLoading,
    lookupResult,
    createCustomerOpen,
    createVehicleOpen,
    autoScanStatus,
  ]);

  useEffect(() => {
    if (!lookupResult || lookupResult.found) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setCustomerSearchLoading(true);
        const response = await adminService.getCustomers({
          limit: 12,
          search: customerSearch || undefined,
        });
        setCustomerResults(response.customers);
      } catch (error) {
        console.error('Erro ao buscar clientes para vinculação:', error);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [customerSearch, lookupResult]);

  const lookupPlate = async (plateInput: string) => {
    const normalizedPlate = normalizePlate(plateInput);

    if (!isValidBrazilianPlate(normalizedPlate)) {
      toast({
        title: 'Placa inválida',
        description: 'Use um formato válido, como ABC-1234 ou ABC1D23.',
        variant: 'destructive',
      });
      return;
    }

    if (pendingLookupPlateRef.current === normalizedPlate) {
      return;
    }

    pendingLookupPlateRef.current = normalizedPlate;
    setLookupLoading(true);
    setLookupResult(null);
    setSelectedCustomer(null);

    try {
      const result = await adminService.lookupVehicleByPlate(normalizedPlate);
      setLookupResult(result);
      setManualPlate(result.plate);
      setAutoScanStatus(
        result.found
          ? `Placa confirmada: ${formatPlate(result.plate)}. Veiculo encontrado.`
          : `Placa confirmada: ${formatPlate(result.plate)}. Veiculo ainda nao cadastrado.`
      );

      if (result.found) {
        toast({
          title: 'Veículo encontrado',
          description: `${result.vehicle?.brand} ${result.vehicle?.model} • ${formatPlate(result.plate)}`,
        });
      }
    } catch (error: any) {
      console.error('Erro ao buscar placa:', error);
      toast({
        title: 'Erro ao buscar placa',
        description:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Não foi possível localizar a placa no momento.',
        variant: 'destructive',
      });
    } finally {
      pendingLookupPlateRef.current = null;
      setLookupLoading(false);
    }
  };

  const canvasToBlob = (sourceCanvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      sourceCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Nao foi possivel gerar a imagem capturada.'));
          return;
        }

        resolve(blob);
      }, 'image/jpeg', 0.92);
    });

  const captureFrameBlob = async (captureMode: CaptureMode) => {
    if (!videoRef.current || !canvasRef.current) {
      throw new Error('Camera indisponivel para captura.');
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || !video.videoWidth || !video.videoHeight) {
      throw new Error('A camera ainda nao ficou pronta.');
    }

    const captureRect = getCaptureRect(video.videoWidth, video.videoHeight, captureMode);
    const maxTargetWidth = captureMode === 'guide' ? 960 : 1280;
    const scale = Math.min(1, maxTargetWidth / captureRect.sw);

    canvas.width = Math.max(1, Math.round(captureRect.sw * scale));
    canvas.height = Math.max(1, Math.round(captureRect.sh * scale));
    context.drawImage(
      video,
      captureRect.sx,
      captureRect.sy,
      captureRect.sw,
      captureRect.sh,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvasToBlob(canvas);
  };

  const handleAutoRecognition = async (candidates: RecognizedPlateCandidate[]) => {
    const normalizedCandidates = normalizeCandidates(candidates);
    setRecognizedCandidates(normalizedCandidates);

    if (normalizedCandidates.length === 0) {
      if (recognitionHistoryRef.current.length > 0) {
        recognitionHistoryRef.current = recognitionHistoryRef.current.slice(1);
      }

      setAutoScanStatus('Lendo continuamente... aproxime a placa da guia.');
      return;
    }

    const primaryCandidate = normalizedCandidates[0];
    setManualPlate(primaryCandidate.plate);

    recognitionHistoryRef.current = [
      ...recognitionHistoryRef.current,
      { plate: primaryCandidate.plate, confidence: primaryCandidate.confidence },
    ].slice(-AUTO_SCAN_HISTORY_SIZE);

    const grouped = recognitionHistoryRef.current.reduce<
      Record<string, { count: number; confidenceSum: number }>
    >((accumulator, entry) => {
      const current = accumulator[entry.plate] || { count: 0, confidenceSum: 0 };
      accumulator[entry.plate] = {
        count: current.count + 1,
        confidenceSum: current.confidenceSum + entry.confidence,
      };
      return accumulator;
    }, {});

    const winner = Object.entries(grouped)
      .map(([plate, stats]) => ({
        plate,
        count: stats.count,
        averageConfidence: stats.confidenceSum / stats.count,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return right.averageConfidence - left.averageConfidence;
      })[0];

    if (
      !winner ||
      winner.count < AUTO_SCAN_CONFIRMATIONS_REQUIRED ||
      winner.averageConfidence < AUTO_SCAN_MIN_CONFIDENCE
    ) {
      setAutoScanStatus(
        `Detectado ${formatPlate(primaryCandidate.plate)}. Confirmando leitura automatica...`
      );
      return;
    }

    setAutoScanStatus(`Placa ${formatPlate(winner.plate)} confirmada. Buscando veiculo...`);
    resetRecognitionHistory();
    openResultStep('camera');
    await lookupPlate(winner.plate);
  };

  const runAutoScan = async () => {
    if (autoScanInFlightRef.current || !cameraReady || lookupLoading || lookupResult) {
      return;
    }

    autoScanInFlightRef.current = true;
    autoScanAttemptRef.current += 1;

    try {
      const captureMode: CaptureMode =
        autoScanAttemptRef.current % 4 === 0 ? 'full' : 'guide';
      const imageBlob = await captureFrameBlob(captureMode);
      const recognition = await adminService.recognizeVehiclePlate(imageBlob);
      await handleAutoRecognition(recognition.candidates);
    } catch (error) {
      console.error('Erro na leitura automatica da placa:', error);
      setAutoScanStatus('Falha temporaria na leitura automatica. Tentando novamente...');
    } finally {
      autoScanInFlightRef.current = false;
    }
  };

  const capturePlate = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || !video.videoWidth || !video.videoHeight) {
      setCameraError('A câmera ainda não ficou pronta. Tente novamente.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedPreview(null);
    setOcrLoading(true);
    setRecognizedCandidates([]);

    try {
      const imageBlob = await canvasToBlob(canvas);
      const recognition = await adminService.recognizeVehiclePlate(imageBlob);

      if (recognition.candidates.length === 0 || !recognition.plate) {
        toast({
          title: 'Placa n?o reconhecida',
          description: 'Aproxime a c?mera da placa e tente novamente, ou digite manualmente.',
          variant: 'destructive',
        });
        return;
      }

      setRecognizedCandidates(recognition.candidates);
      setManualPlate(recognition.plate);
      openResultStep('camera');
      await lookupPlate(recognition.plate);
    } catch (error: any) {
      console.error('Erro no reconhecimento da placa:', error);
      toast({
        title: 'Falha ao ler a placa',
        description:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'N?o foi poss?vel processar a imagem da c?mera.',
        variant: 'destructive',
      });
    } finally {
      setOcrLoading(false);
    }
  };

  const startNfcScan = async () => {
    if (!nfcSupported) {
      setNfcStatus('Este aparelho ou navegador não expõe a API de NFC para a web.');
      return;
    }

    try {
      stopNfcScan();
      const controller = new AbortController();
      nfcAbortControllerRef.current = controller;
      setNfcStatus('Aproxime a tag NFC do veículo para ler a placa.');
      setNfcScanning(true);

      const NdefReaderConstructor = (window as Window & { NDEFReader?: any }).NDEFReader;
      const reader = new NdefReaderConstructor();

      reader.addEventListener('readingerror', () => {
        setNfcStatus('A tag foi detectada, mas o conteúdo não pôde ser lido.');
      });

      reader.addEventListener('reading', async (event: any) => {
        try {
          const records = Array.from(event.message?.records || []) as any[];
          const payloads = records
            .map((record) => readNdefRecordText(record))
            .filter(Boolean);

          const plate =
            payloads
              .map((payload) => extractPlateFromNfcPayload(payload))
              .find(Boolean) || null;

          if (!plate) {
            setNfcStatus('Tag lida, mas nenhum identificador de placa válido foi encontrado.');
            return;
          }

          setManualPlate(plate);
          setNfcStatus(`Tag lida com sucesso: ${formatPlate(plate)}`);
          openResultStep('nfc');
          stopNfcScan();
          await lookupPlate(plate);
        } catch (error) {
          console.error('Erro ao processar payload NFC:', error);
          setNfcStatus('A tag foi lida, mas o conteúdo não pôde ser interpretado.');
        }
      });

      await reader.scan({ signal: controller.signal });
    } catch (error) {
      console.error('Erro ao iniciar NFC:', error);
      setNfcStatus('Não foi possível iniciar a leitura NFC neste dispositivo.');
      setNfcScanning(false);
    }
  };

  const handleUseFoundVehicle = () => {
    if (!lookupResult?.found || !lookupResult.customer || !lookupResult.vehicle) {
      return;
    }

    onResolved({
      customer: mapCustomer(lookupResult.customer),
      vehicle: mapVehicle(lookupResult.vehicle),
    });
    onClose();
  };

  const handleCreateCustomerSuccess = (customer: ProvisionalUser) => {
    setSelectedCustomer(customer);
    setCreateCustomerOpen(false);
    setCreateVehicleOpen(true);
  };

  const handleCreateVehicleSuccess = (vehicle: AdminCustomerVehicle) => {
    if (!selectedCustomer) {
      return;
    }

    onResolved({
      customer: mapCustomer(selectedCustomer),
      vehicle: mapVehicle(vehicle),
    });
    setCreateVehicleOpen(false);
    onClose();
  };

  const handleOpenManualFlow = () => {
    openResultStep('manual');
    setLookupResult(null);
    setLookupLoading(false);
    setManualPlate('');
    setRecognizedCandidates([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerResults([]);
  };

  const showAssociationFlow = Boolean(lookupResult && !lookupResult.found);
  const showLookupLoadingState = currentStep === 'result' && lookupLoading;
  const showManualSearchState =
    currentStep === 'result' &&
    (resultSource === 'manual' || (!lookupLoading && !lookupResult));
  const resultSourceLabel =
    resultSource === 'camera'
      ? 'Leitura pela camera'
      : resultSource === 'nfc'
        ? 'Leitura por NFC'
        : resultSource === 'manual'
          ? 'Busca manual'
          : 'Consulta';
  const dialogTitle = currentStep === 'scan' ? 'Identificar Veiculo' : 'Resultado da placa';
  const dialogDescription =
    currentStep === 'scan'
      ? 'Use a camera em tela cheia para ler a placa. NFC e busca manual ficam disponiveis como alternativas.'
      : 'Confira o resultado e escolha como continuar: usar o veiculo encontrado, vincular a placa a um cliente ou seguir manualmente.';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ResponsiveDialogContent
          size="xl"
          className={`p-0 flex flex-col gap-0 ${
            isCameraScanStep
              ? '!w-screen !max-w-none !h-[100dvh] !max-h-[100dvh] rounded-none border-0 sm:!w-[calc(100vw-2rem)] sm:!max-w-[56rem] sm:!h-[calc(100vh-3rem)] sm:!max-h-[calc(100vh-3rem)] sm:rounded-2xl sm:border'
              : ''
          }`}
        >
          <ResponsiveDialogHeader
            className={
              isCameraScanStep ? 'sr-only border-b-0 bg-transparent px-0 py-0' : undefined
            }
          >
            <ResponsiveDialogTitleRow>
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-moria-orange" />
                  {dialogTitle}
                </DialogTitle>
                <DialogDescription>{dialogDescription}</DialogDescription>
              </div>

              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant={mode === 'camera' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => (currentStep === 'scan' ? setMode('camera') : returnToScanStep())}
                >
                  <Camera className="h-4 w-4" />
                  Câmera
                </Button>
                <Button
                  type="button"
                  variant={mode === 'nfc' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => (currentStep === 'scan' ? setMode('nfc') : handleOpenManualFlow())}
                >
                  <Nfc className="h-4 w-4" />
                  {currentStep === 'scan' ? 'NFC' : 'Manual'}
                </Button>
              </div>
            </ResponsiveDialogTitleRow>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody
            className={
              isCameraScanStep
                ? 'flex flex-col overflow-hidden px-0 py-0 sm:px-0 sm:py-0'
                : 'space-y-4'
            }
          >
            {currentStep === 'scan' ? (
              mode === 'camera' ? (
                <div className="flex min-h-full flex-1 flex-col bg-slate-950 text-white">
                  <div className="relative flex-1 overflow-hidden">
                    {capturedPreview ? (
                      <img
                        src={capturedPreview}
                        alt="Prévia da placa capturada"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        autoPlay
                        playsInline
                        muted
                      />
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-black/25" />
                    <div className="pointer-events-none absolute inset-x-[8%] top-[32%] bottom-[32%] rounded-[2rem] border-2 border-dashed border-white/85 shadow-[0_0_0_9999px_rgba(2,6,23,0.26)]" />

                    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center px-4 pt-6">
                      <div className="rounded-full bg-black/45 px-4 py-2 text-center text-sm font-medium backdrop-blur">
                        Aponte para a placa e aguarde a leitura
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                      <div className="mx-auto max-w-md rounded-[1.5rem] border border-white/15 bg-black/50 p-3 backdrop-blur">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="min-w-0 text-sm text-white/85">{autoScanStatus}</p>
                          <Badge
                            variant="secondary"
                            className="shrink-0 border-white/10 bg-white/10 text-white hover:bg-white/10"
                          >
                            {autoScanEnabled ? 'Auto' : 'Pausado'}
                          </Badge>
                        </div>

                        {cameraError && (
                          <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                            {cameraError}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <Button
                            type="button"
                            className="bg-moria-orange text-white hover:bg-moria-orange/90"
                            onClick={capturePlate}
                            disabled={!cameraReady || ocrLoading}
                          >
                            {ocrLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Lendo
                              </>
                            ) : (
                              <>
                                <Camera className="h-4 w-4" />
                                Ler agora
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                            onClick={() => {
                              const nextValue = !autoScanEnabled;
                              setAutoScanEnabled(nextValue);
                              setAutoScanStatus(
                                nextValue
                                  ? 'Leitura automatica reativada. Mantenha a placa dentro da guia.'
                                  : 'Leitura automatica pausada. Use "Ler agora" ou retome o modo automatico.'
                              );

                              if (!nextValue) {
                                clearAutoScanTimer();
                              }
                            }}
                          >
                            <ScanLine className="h-4 w-4" />
                            {autoScanEnabled ? 'Pausar' : 'Retomar'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                            onClick={handleOpenManualFlow}
                          >
                            <Search className="h-4 w-4" />
                            Manual
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                            onClick={() => setMode('nfc')}
                          >
                            <Nfc className="h-4 w-4" />
                            NFC
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Alternativa por NFC</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Smartphone className="h-4 w-4" />
                      <AlertDescription>
                        Funciona apenas em contexto seguro (HTTPS), tela principal, Chrome/Android compatível e com permissão concedida.
                      </AlertDescription>
                    </Alert>

                    <Button
                      type="button"
                      className="w-full bg-moria-orange hover:bg-moria-orange/90"
                      onClick={startNfcScan}
                      disabled={nfcScanning}
                    >
                      {nfcScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aguardando tag NFC...
                        </>
                      ) : (
                        <>
                          <Nfc className="h-4 w-4" />
                          Ler tag NFC do veículo
                        </>
                      )}
                    </Button>

                    <Button type="button" variant="outline" onClick={handleOpenManualFlow}>
                      <Search className="h-4 w-4" />
                      Fazer manualmente
                    </Button>

                    {nfcStatus && (
                      <Alert>
                        <AlertDescription>{nfcStatus}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )
            ) : (
              <>
                <Card className="border-moria-orange/20 bg-moria-orange/5">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {resolvedPlate
                            ? `Placa analisada: ${formatPlate(resolvedPlate)}`
                            : 'Defina a placa para continuar'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {lookupResult?.found
                            ? 'A placa já está cadastrada. Revise os dados abaixo e inicie a revisão.'
                            : showAssociationFlow
                              ? 'A placa ainda não existe no sistema. Vincule-a a um cliente antes de prosseguir.'
                              : 'Use esta etapa para buscar a placa manualmente ou voltar para uma nova leitura.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{resultSourceLabel}</Badge>
                        <Button type="button" variant="outline" size="sm" onClick={returnToScanStep}>
                          Nova leitura
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {showLookupLoadingState && (
                  <Card>
                    <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Consultando a placa no sistema...
                    </CardContent>
                  </Card>
                )}

                {showManualSearchState && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Busca manual da placa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="manual-plate">Placa</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            id="manual-plate"
                            value={formatPlate(manualPlate)}
                            onChange={(event) => {
                              setManualPlate(event.target.value);
                              setLookupResult(null);
                            }}
                            placeholder="ABC-1234 ou ABC1D23"
                            maxLength={8}
                          />
                          <Button
                            type="button"
                            onClick={() => lookupPlate(manualPlate)}
                            disabled={lookupLoading}
                            className="bg-moria-orange hover:bg-moria-orange/90"
                          >
                            {lookupLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                            Buscar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {lookupResult?.found && lookupResult.customer && lookupResult.vehicle && (
                  <Card className="border-emerald-200 bg-emerald-50/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" />
                        Veículo identificado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border bg-white p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <User className="h-4 w-4" />
                            Cliente
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold">{lookupResult.customer.name}</p>
                            <p>{lookupResult.customer.email}</p>
                            <p>{lookupResult.customer.whatsapp}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border bg-white p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Car className="h-4 w-4" />
                            Veículo
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold">
                              {lookupResult.vehicle.brand} {lookupResult.vehicle.model}
                            </p>
                            <p>{lookupResult.vehicle.year}</p>
                            <p>{formatPlate(lookupResult.vehicle.plate)}</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="w-full bg-moria-orange hover:bg-moria-orange/90"
                        onClick={handleUseFoundVehicle}
                      >
                        Usar cliente e veículo para iniciar a revisão
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {showAssociationFlow && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Placa ainda não cadastrada</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <AlertDescription>
                          A placa <strong>{formatPlate(resolvedPlate)}</strong> ainda não está vinculada a um veículo. Selecione um cliente existente ou cadastre um novo para continuar.
                        </AlertDescription>
                      </Alert>

                      {selectedCustomer ? (
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <User className="h-4 w-4" />
                              Cliente selecionado
                            </div>
                            <Badge variant="secondary">Pronto para vincular</Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold">{selectedCustomer.name}</p>
                            <p>{selectedCustomer.email}</p>
                            <p>{selectedCustomer.whatsapp}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-3 px-0"
                            onClick={() => setSelectedCustomer(null)}
                          >
                            Trocar cliente
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="customer-search">Buscar cliente existente</Label>
                            <Input
                              id="customer-search"
                              value={customerSearch}
                              onChange={(event) => setCustomerSearch(event.target.value)}
                              placeholder="Nome, email, telefone ou CPF"
                            />
                          </div>

                          <div className="rounded-xl border">
                            <div className="border-b px-4 py-3 text-sm font-medium">
                              Clientes disponíveis
                            </div>
                            <div className="max-h-56 overflow-y-auto divide-y">
                              {customerSearchLoading ? (
                                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Buscando clientes...
                                </div>
                              ) : customerResults.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-muted-foreground">
                                  Nenhum cliente encontrado.
                                </div>
                              ) : (
                                customerResults.map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                                    onClick={() => setSelectedCustomer(customer)}
                                  >
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold">{customer.name}</p>
                                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                                      <p className="text-xs text-muted-foreground">{customer.whatsapp}</p>
                                    </div>
                                    <Badge variant="outline">Selecionar</Badge>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateCustomerOpen(true)}
                        >
                          <User className="h-4 w-4" />
                          Novo cliente
                        </Button>
                        <Button
                          type="button"
                          className="bg-moria-orange hover:bg-moria-orange/90"
                          disabled={!selectedCustomer}
                          onClick={() => setCreateVehicleOpen(true)}
                        >
                          <Car className="h-4 w-4" />
                          Cadastrar veículo com esta placa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </Dialog>

      <CreateCustomerModal
        isOpen={createCustomerOpen}
        onClose={() => setCreateCustomerOpen(false)}
        onSuccess={handleCreateCustomerSuccess}
      />

      {selectedCustomer && (
        <CreateVehicleModal
          customerId={selectedCustomer.id}
          isOpen={createVehicleOpen}
          onClose={() => setCreateVehicleOpen(false)}
          onSuccess={handleCreateVehicleSuccess}
          initialValues={{ plate: resolvedPlate }}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
