import { useState, useEffect, useCallback } from 'react';
import { Device } from '@capacitor/device';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Motion } from '@capacitor/motion';
import { ActionSheet } from '@capacitor/action-sheet';
import { App as CapApp } from '@capacitor/app';
import { AppLauncher } from '@capacitor/app-launcher';
import { Browser } from '@capacitor/browser';
import { Dialog } from '@capacitor/dialog';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { ScreenReader } from '@capacitor/screen-reader';
import { Toast } from '@capacitor/toast';
import { TextZoom } from '@capacitor/text-zoom';
import './App.css';

// ---------- Types ----------

interface DeviceInfoState {
  model: string;
  platform: string;
  osVersion: string;
  manufacturer: string;
  batteryLevel: number;
  isCharging: boolean;
  languageCode: string;
}

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface NetworkState {
  connected: boolean;
  connectionType: string;
}

interface MotionState {
  x: number;
  y: number;
  z: number;
}

type CardStatus = 'idle' | 'loading' | 'success' | 'error';

// ---------- Helper ----------

function StatusBadge({ status }: { status: CardStatus }) {
  const label = { idle: '', loading: '...', success: 'OK', error: '!!' }[status];
  return <span className={`status status-${status}`}>{label}</span>;
}

// ---------- App ----------

function App() {
  // Existing states
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoState | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkState | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<string>('');
  const [motionData, setMotionData] = useState<MotionState | null>(null);
  const [motionListening, setMotionListening] = useState(false);
  const [clipboardContent, setClipboardContent] = useState<string>('');

  // New states
  const [appInfo, setAppInfo] = useState<string>('');
  const [actionSheetResult, setActionSheetResult] = useState<string>('');
  const [launcherResult, setLauncherResult] = useState<string>('');
  const [dialogResult, setDialogResult] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [prefValue, setPrefValue] = useState<string>('');
  const [screenReaderEnabled, setScreenReaderEnabled] = useState<boolean | null>(null);
  const [textZoomLevel, setTextZoomLevel] = useState<number | null>(null);

  // Status tracking
  const [cardStatus, setCardStatus] = useState<Record<string, CardStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateStatus = (card: string, status: CardStatus, error?: string) => {
    setCardStatus(prev => ({ ...prev, [card]: status }));
    if (error) {
      setErrors(prev => ({ ...prev, [card]: error }));
    } else {
      setErrors(prev => {
        const next = { ...prev };
        delete next[card];
        return next;
      });
    }
  };

  const run = async (card: string, fn: () => Promise<void>) => {
    updateStatus(card, 'loading');
    try {
      await fn();
      updateStatus(card, 'success');
    } catch (e) {
      updateStatus(card, 'error', String(e));
    }
  };

  // ====== Handlers ======

  // Device Info
  const getDeviceInfo = useCallback(async () => {
    await run('device', async () => {
      const info = await Device.getInfo();
      const battery = await Device.getBatteryInfo();
      const lang = await Device.getLanguageCode();
      setDeviceInfo({
        model: info.model,
        platform: info.platform,
        osVersion: info.osVersion,
        manufacturer: info.manufacturer,
        batteryLevel: battery.batteryLevel ?? -1,
        isCharging: battery.isCharging ?? false,
        languageCode: lang.value,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camera
  const takePhoto = () => run('camera', async () => {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
    });
    setPhotoUrl(photo.webPath ?? null);
  });

  // Geolocation
  const getLocation = () => run('geo', async () => {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    setLocation({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
  });

  // Haptics
  const triggerHaptic = (type: 'impact' | 'notification' | 'vibrate') =>
    run('haptics', async () => {
      if (type === 'impact') await Haptics.impact({ style: ImpactStyle.Heavy });
      else if (type === 'notification') await Haptics.notification({ type: NotificationType.Success });
      else await Haptics.vibrate({ duration: 300 });
    });

  // Network
  const getNetworkStatus = useCallback(async () => {
    await run('network', async () => {
      const status = await Network.getStatus();
      setNetworkStatus({
        connected: status.connected,
        connectionType: status.connectionType,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clipboard
  const writeClipboard = () => run('clipboard', async () => {
    await Clipboard.write({ string: 'Hello from Capacitor!' });
  });

  const readClipboard = () => run('clipboard', async () => {
    const result = await Clipboard.read();
    setClipboardContent(result.value);
  });

  // Share
  const shareContent = () => run('share', async () => {
    await Share.share({
      title: 'Capacitor Demo',
      text: '看看这个 Capacitor 硬件功能 Demo!',
      url: 'https://capacitorjs.com',
      dialogTitle: '分享到...',
    });
  });

  // Screen Orientation
  const getOrientation = () => run('orientation', async () => {
    const result = await ScreenOrientation.orientation();
    setOrientation(result.type);
  });

  // Motion
  const toggleMotion = async () => {
    if (motionListening) {
      await Motion.removeAllListeners();
      setMotionListening(false);
      setMotionData(null);
      updateStatus('motion', 'idle');
    } else {
      await run('motion', async () => {
        await Motion.addListener('accel', (event) => {
          setMotionData({
            x: parseFloat(event.acceleration.x.toFixed(3)),
            y: parseFloat(event.acceleration.y.toFixed(3)),
            z: parseFloat(event.acceleration.z.toFixed(3)),
          });
        });
        setMotionListening(true);
      });
    }
  };

  // Action Sheet
  const showActionSheet = () => run('actionSheet', async () => {
    const result = await ActionSheet.showActions({
      title: '选择一个操作',
      message: '这是一个 Action Sheet 示例',
      options: [
        { title: '拍照' },
        { title: '从相册选择' },
        { title: '取消' },
      ],
    });
    setActionSheetResult(`选择了第 ${result.index + 1} 项`);
  });

  // App Info
  const getAppInfo = () => run('app', async () => {
    const info = await CapApp.getInfo();
    setAppInfo(`${info.name} v${info.version} (build ${info.build})`);
  });

  // App Launcher
  const checkLauncher = () => run('launcher', async () => {
    const result = await AppLauncher.canOpenUrl({ url: 'https://capacitorjs.com' });
    setLauncherResult(result.value ? '可以打开' : '无法打开');
  });

  // Browser
  const openBrowser = () => run('browser', async () => {
    await Browser.open({ url: 'https://capacitorjs.com' });
  });

  // Dialog
  const showAlert = () => run('dialog', async () => {
    await Dialog.alert({ title: '提示', message: '这是一个原生 Alert 对话框!' });
    setDialogResult('Alert 已关闭');
  });

  const showConfirm = () => run('dialog', async () => {
    const { value } = await Dialog.confirm({
      title: '确认',
      message: '你确定要继续吗？',
      okButtonTitle: '确定',
      cancelButtonTitle: '取消',
    });
    setDialogResult(value ? '点击了确定' : '点击了取消');
  });

  const showPrompt = () => run('dialog', async () => {
    const { value, cancelled } = await Dialog.prompt({
      title: '输入',
      message: '请输入你的名字:',
      okButtonTitle: '确定',
      cancelButtonTitle: '取消',
    });
    setDialogResult(cancelled ? '已取消' : `输入了: ${value}`);
  });

  // Filesystem
  const writeFile = () => run('filesystem', async () => {
    await Filesystem.writeFile({
      path: 'capacitor-demo.txt',
      data: `Hello Capacitor! 写入时间: ${new Date().toLocaleString()}`,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    setFileContent('文件已写入 Documents/capacitor-demo.txt');
  });

  const readFile = () => run('filesystem', async () => {
    const result = await Filesystem.readFile({
      path: 'capacitor-demo.txt',
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    setFileContent(typeof result.data === 'string' ? result.data : '(blob data)');
  });

  // Local Notifications
  const scheduleNotification = () => run('notification', async () => {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Capacitor Demo',
          body: '这是一条本地通知! 🔔',
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 3000) },
        },
      ],
    });
  });

  // Preferences (Key-Value Storage)
  const savePref = () => run('preferences', async () => {
    const ts = new Date().toLocaleString();
    await Preferences.set({ key: 'demo_key', value: ts });
    setPrefValue(`已保存: ${ts}`);
  });

  const loadPref = () => run('preferences', async () => {
    const { value } = await Preferences.get({ key: 'demo_key' });
    setPrefValue(value ? `读取: ${value}` : '(空)');
  });

  const clearPref = () => run('preferences', async () => {
    await Preferences.remove({ key: 'demo_key' });
    setPrefValue('已清除');
  });

  // Screen Reader
  const checkScreenReader = () => run('screenReader', async () => {
    const { value } = await ScreenReader.isEnabled();
    setScreenReaderEnabled(value);
  });

  const speakText = () => run('screenReader', async () => {
    await ScreenReader.speak({ value: '你好，这是 Capacitor 的语音朗读功能' });
  });

  // Toast
  const showToast = (position: 'top' | 'center' | 'bottom') =>
    run('toast', async () => {
      await Toast.show({ text: `Toast 消息 (${position})`, duration: 'short', position });
    });

  // Text Zoom
  const getTextZoom = () => run('textZoom', async () => {
    const { value } = await TextZoom.get();
    setTextZoomLevel(value);
  });

  const setTextZoom = (level: number) => run('textZoom', async () => {
    await TextZoom.set({ value: level });
    setTextZoomLevel(level);
  });

  // ====== Lifecycle ======

  useEffect(() => {
    getDeviceInfo();
    getNetworkStatus();

    const handler = Network.addListener('networkStatusChange', (status) => {
      setNetworkStatus({
        connected: status.connected,
        connectionType: status.connectionType,
      });
    });

    return () => {
      handler.then(h => h.remove());
      Motion.removeAllListeners();
    };
  }, [getDeviceInfo, getNetworkStatus]);

  // ====== Render helpers ======

  const renderCard = (
    key: string,
    title: string,
    children: React.ReactNode
  ) => (
    <section className="card" key={key}>
      <div className="card-title">
        <h2>{title}</h2>
        <StatusBadge status={cardStatus[key] ?? 'idle'} />
      </div>
      {children}
      {errors[key] && <p className="error">{errors[key]}</p>}
    </section>
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>Capacitor 硬件功能 Demo</h1>
        <p className="subtitle">点击各卡片按钮测试原生功能</p>
      </header>

      <main className="cards">

        {/* ---------- 设备与系统 ---------- */}
        <h3 className="section-title">设备与系统</h3>

        {renderCard('device', '设备信息', <>
          <button onClick={getDeviceInfo}>获取设备信息</button>
          {deviceInfo && (
            <div className="result">
              <p><strong>型号:</strong> {deviceInfo.model}</p>
              <p><strong>平台:</strong> {deviceInfo.platform}</p>
              <p><strong>系统版本:</strong> {deviceInfo.osVersion}</p>
              <p><strong>制造商:</strong> {deviceInfo.manufacturer}</p>
              <p><strong>电量:</strong> {deviceInfo.batteryLevel >= 0 ? `${(deviceInfo.batteryLevel * 100).toFixed(0)}%` : 'N/A'}</p>
              <p><strong>充电中:</strong> {deviceInfo.isCharging ? '是' : '否'}</p>
              <p><strong>语言:</strong> {deviceInfo.languageCode}</p>
            </div>
          )}
        </>)}

        {renderCard('app', '应用信息', <>
          <button onClick={getAppInfo}>获取应用信息</button>
          {appInfo && <div className="result"><p>{appInfo}</p></div>}
        </>)}

        {renderCard('network', '网络状态', <>
          <button onClick={getNetworkStatus}>刷新网络状态</button>
          {networkStatus && (
            <div className="result">
              <p><strong>已连接:</strong> {networkStatus.connected ? '是' : '否'}</p>
              <p><strong>连接类型:</strong> {networkStatus.connectionType}</p>
            </div>
          )}
        </>)}

        {renderCard('orientation', '屏幕方向', <>
          <button onClick={getOrientation}>获取屏幕方向</button>
          {orientation && <div className="result"><p><strong>方向:</strong> {orientation}</p></div>}
        </>)}

        {renderCard('textZoom', '文字缩放', <>
          <div className="button-group">
            <button onClick={getTextZoom}>获取缩放</button>
            <button onClick={() => setTextZoom(1.0)}>100%</button>
            <button onClick={() => setTextZoom(1.5)}>150%</button>
          </div>
          {textZoomLevel !== null && (
            <div className="result"><p><strong>当前缩放:</strong> {(textZoomLevel * 100).toFixed(0)}%</p></div>
          )}
        </>)}

        {/* ---------- 媒体与传感器 ---------- */}
        <h3 className="section-title">媒体与传感器</h3>

        {renderCard('camera', '相机', <>
          <button onClick={takePhoto}>拍照 / 选择图片</button>
          {photoUrl && (
            <div className="result">
              <img src={photoUrl} alt="拍摄的照片" className="photo-preview" />
            </div>
          )}
        </>)}

        {renderCard('geo', '地理位置', <>
          <button onClick={getLocation}>获取当前位置</button>
          {location && (
            <div className="result">
              <p><strong>纬度:</strong> {location.latitude.toFixed(6)}</p>
              <p><strong>经度:</strong> {location.longitude.toFixed(6)}</p>
              <p><strong>精度:</strong> {location.accuracy.toFixed(1)}m</p>
              <p><strong>时间:</strong> {new Date(location.timestamp).toLocaleString()}</p>
            </div>
          )}
        </>)}

        {renderCard('motion', '加速度传感器', <>
          <button onClick={toggleMotion}>
            {motionListening ? '停止监听' : '开始监听'}
          </button>
          {motionData && (
            <div className="result motion-data">
              <p><strong>X:</strong> {motionData.x}</p>
              <p><strong>Y:</strong> {motionData.y}</p>
              <p><strong>Z:</strong> {motionData.z}</p>
            </div>
          )}
        </>)}

        {renderCard('haptics', '触觉反馈', <>
          <div className="button-group">
            <button onClick={() => triggerHaptic('impact')}>重击</button>
            <button onClick={() => triggerHaptic('notification')}>通知</button>
            <button onClick={() => triggerHaptic('vibrate')}>振动</button>
          </div>
        </>)}

        {/* ---------- 用户交互 ---------- */}
        <h3 className="section-title">用户交互</h3>

        {renderCard('dialog', '对话框', <>
          <div className="button-group">
            <button onClick={showAlert}>Alert</button>
            <button onClick={showConfirm}>Confirm</button>
            <button onClick={showPrompt}>Prompt</button>
          </div>
          {dialogResult && <div className="result"><p>{dialogResult}</p></div>}
        </>)}

        {renderCard('actionSheet', '操作表', <>
          <button onClick={showActionSheet}>显示操作表</button>
          {actionSheetResult && <div className="result"><p>{actionSheetResult}</p></div>}
        </>)}

        {renderCard('toast', 'Toast 提示', <>
          <div className="button-group">
            <button onClick={() => showToast('top')}>顶部</button>
            <button onClick={() => showToast('center')}>居中</button>
            <button onClick={() => showToast('bottom')}>底部</button>
          </div>
        </>)}

        {renderCard('share', '分享', <>
          <button onClick={shareContent}>分享内容</button>
        </>)}

        {renderCard('browser', '应用内浏览器', <>
          <button onClick={openBrowser}>打开 Capacitor 官网</button>
        </>)}

        {renderCard('launcher', '应用启动器', <>
          <button onClick={checkLauncher}>检测能否打开 URL</button>
          {launcherResult && <div className="result"><p>{launcherResult}</p></div>}
        </>)}

        {/* ---------- 数据与存储 ---------- */}
        <h3 className="section-title">数据与存储</h3>

        {renderCard('clipboard', '剪贴板', <>
          <div className="button-group">
            <button onClick={writeClipboard}>写入</button>
            <button onClick={readClipboard}>读取</button>
          </div>
          {clipboardContent && <div className="result"><p><strong>内容:</strong> {clipboardContent}</p></div>}
        </>)}

        {renderCard('preferences', '键值存储', <>
          <div className="button-group">
            <button onClick={savePref}>保存</button>
            <button onClick={loadPref}>读取</button>
            <button onClick={clearPref}>清除</button>
          </div>
          {prefValue && <div className="result"><p>{prefValue}</p></div>}
        </>)}

        {renderCard('filesystem', '文件系统', <>
          <div className="button-group">
            <button onClick={writeFile}>写入文件</button>
            <button onClick={readFile}>读取文件</button>
          </div>
          {fileContent && <div className="result"><p>{fileContent}</p></div>}
        </>)}

        {/* ---------- 通知与辅助 ---------- */}
        <h3 className="section-title">通知与辅助</h3>

        {renderCard('notification', '本地通知', <>
          <button onClick={scheduleNotification}>3秒后发送通知</button>
        </>)}

        {renderCard('screenReader', '屏幕阅读器', <>
          <div className="button-group">
            <button onClick={checkScreenReader}>检测状态</button>
            <button onClick={speakText}>语音朗读</button>
          </div>
          {screenReaderEnabled !== null && (
            <div className="result">
              <p><strong>屏幕阅读器:</strong> {screenReaderEnabled ? '已启用' : '未启用'}</p>
            </div>
          )}
        </>)}

      </main>

      <footer className="app-footer">
        <p>Powered by Capacitor + React + TypeScript</p>
      </footer>
    </div>
  );
}

export default App;
