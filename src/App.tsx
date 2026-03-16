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
import './App.css';

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

function App() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoState | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkState | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<string>('');
  const [motionData, setMotionData] = useState<MotionState | null>(null);
  const [motionListening, setMotionListening] = useState(false);
  const [clipboardContent, setClipboardContent] = useState<string>('');
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

  // Device Info
  const getDeviceInfo = useCallback(async () => {
    updateStatus('device', 'loading');
    try {
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
      updateStatus('device', 'success');
    } catch (e) {
      updateStatus('device', 'error', String(e));
    }
  }, []);

  // Camera
  const takePhoto = async () => {
    updateStatus('camera', 'loading');
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });
      setPhotoUrl(photo.webPath ?? null);
      updateStatus('camera', 'success');
    } catch (e) {
      updateStatus('camera', 'error', String(e));
    }
  };

  // Geolocation
  const getLocation = async () => {
    updateStatus('geo', 'loading');
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
      updateStatus('geo', 'success');
    } catch (e) {
      updateStatus('geo', 'error', String(e));
    }
  };

  // Haptics
  const triggerHaptic = async (type: 'impact' | 'notification' | 'vibrate') => {
    updateStatus('haptics', 'loading');
    try {
      switch (type) {
        case 'impact':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'notification':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'vibrate':
          await Haptics.vibrate({ duration: 300 });
          break;
      }
      updateStatus('haptics', 'success');
    } catch (e) {
      updateStatus('haptics', 'error', String(e));
    }
  };

  // Network
  const getNetworkStatus = useCallback(async () => {
    updateStatus('network', 'loading');
    try {
      const status = await Network.getStatus();
      setNetworkStatus({
        connected: status.connected,
        connectionType: status.connectionType,
      });
      updateStatus('network', 'success');
    } catch (e) {
      updateStatus('network', 'error', String(e));
    }
  }, []);

  // Clipboard
  const writeClipboard = async () => {
    updateStatus('clipboard', 'loading');
    try {
      await Clipboard.write({ string: 'Hello from Capacitor!' });
      updateStatus('clipboard', 'success');
    } catch (e) {
      updateStatus('clipboard', 'error', String(e));
    }
  };

  const readClipboard = async () => {
    updateStatus('clipboard', 'loading');
    try {
      const result = await Clipboard.read();
      setClipboardContent(result.value);
      updateStatus('clipboard', 'success');
    } catch (e) {
      updateStatus('clipboard', 'error', String(e));
    }
  };

  // Share
  const shareContent = async () => {
    updateStatus('share', 'loading');
    try {
      await Share.share({
        title: 'Capacitor Demo',
        text: '看看这个 Capacitor 硬件功能 Demo!',
        url: 'https://capacitorjs.com',
        dialogTitle: '分享到...',
      });
      updateStatus('share', 'success');
    } catch (e) {
      updateStatus('share', 'error', String(e));
    }
  };

  // Screen Orientation
  const getOrientation = async () => {
    updateStatus('orientation', 'loading');
    try {
      const result = await ScreenOrientation.orientation();
      setOrientation(result.type);
      updateStatus('orientation', 'success');
    } catch (e) {
      updateStatus('orientation', 'error', String(e));
    }
  };

  // Motion
  const toggleMotion = async () => {
    if (motionListening) {
      await Motion.removeAllListeners();
      setMotionListening(false);
      setMotionData(null);
      updateStatus('motion', 'idle');
    } else {
      updateStatus('motion', 'loading');
      try {
        await Motion.addListener('accel', (event) => {
          setMotionData({
            x: parseFloat(event.acceleration.x.toFixed(3)),
            y: parseFloat(event.acceleration.y.toFixed(3)),
            z: parseFloat(event.acceleration.z.toFixed(3)),
          });
        });
        setMotionListening(true);
        updateStatus('motion', 'success');
      } catch (e) {
        updateStatus('motion', 'error', String(e));
      }
    }
  };

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

  const statusIcon = (card: string) => {
    const s = cardStatus[card];
    if (s === 'loading') return '...';
    if (s === 'success') return 'OK';
    if (s === 'error') return '!!';
    return '';
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Capacitor 硬件功能 Demo</h1>
        <p className="subtitle">点击各卡片按钮测试原生硬件功能</p>
      </header>

      <main className="cards">
        {/* Device Info */}
        <section className="card">
          <div className="card-title">
            <h2>设备信息</h2>
            <span className={`status status-${cardStatus['device'] ?? 'idle'}`}>
              {statusIcon('device')}
            </span>
          </div>
          <button onClick={getDeviceInfo}>获取设备信息</button>
          {errors['device'] && <p className="error">{errors['device']}</p>}
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
        </section>

        {/* Camera */}
        <section className="card">
          <div className="card-title">
            <h2>相机</h2>
            <span className={`status status-${cardStatus['camera'] ?? 'idle'}`}>
              {statusIcon('camera')}
            </span>
          </div>
          <button onClick={takePhoto}>拍照 / 选择图片</button>
          {errors['camera'] && <p className="error">{errors['camera']}</p>}
          {photoUrl && (
            <div className="result">
              <img src={photoUrl} alt="拍摄的照片" className="photo-preview" />
            </div>
          )}
        </section>

        {/* Geolocation */}
        <section className="card">
          <div className="card-title">
            <h2>地理位置</h2>
            <span className={`status status-${cardStatus['geo'] ?? 'idle'}`}>
              {statusIcon('geo')}
            </span>
          </div>
          <button onClick={getLocation}>获取当前位置</button>
          {errors['geo'] && <p className="error">{errors['geo']}</p>}
          {location && (
            <div className="result">
              <p><strong>纬度:</strong> {location.latitude.toFixed(6)}</p>
              <p><strong>经度:</strong> {location.longitude.toFixed(6)}</p>
              <p><strong>精度:</strong> {location.accuracy.toFixed(1)}m</p>
              <p><strong>时间:</strong> {new Date(location.timestamp).toLocaleString()}</p>
            </div>
          )}
        </section>

        {/* Haptics */}
        <section className="card">
          <div className="card-title">
            <h2>触觉反馈</h2>
            <span className={`status status-${cardStatus['haptics'] ?? 'idle'}`}>
              {statusIcon('haptics')}
            </span>
          </div>
          <div className="button-group">
            <button onClick={() => triggerHaptic('impact')}>重击</button>
            <button onClick={() => triggerHaptic('notification')}>通知</button>
            <button onClick={() => triggerHaptic('vibrate')}>振动</button>
          </div>
          {errors['haptics'] && <p className="error">{errors['haptics']}</p>}
        </section>

        {/* Network */}
        <section className="card">
          <div className="card-title">
            <h2>网络状态</h2>
            <span className={`status status-${cardStatus['network'] ?? 'idle'}`}>
              {statusIcon('network')}
            </span>
          </div>
          <button onClick={getNetworkStatus}>刷新网络状态</button>
          {errors['network'] && <p className="error">{errors['network']}</p>}
          {networkStatus && (
            <div className="result">
              <p><strong>已连接:</strong> {networkStatus.connected ? '是' : '否'}</p>
              <p><strong>连接类型:</strong> {networkStatus.connectionType}</p>
            </div>
          )}
        </section>

        {/* Clipboard */}
        <section className="card">
          <div className="card-title">
            <h2>剪贴板</h2>
            <span className={`status status-${cardStatus['clipboard'] ?? 'idle'}`}>
              {statusIcon('clipboard')}
            </span>
          </div>
          <div className="button-group">
            <button onClick={writeClipboard}>写入剪贴板</button>
            <button onClick={readClipboard}>读取剪贴板</button>
          </div>
          {errors['clipboard'] && <p className="error">{errors['clipboard']}</p>}
          {clipboardContent && (
            <div className="result">
              <p><strong>内容:</strong> {clipboardContent}</p>
            </div>
          )}
        </section>

        {/* Share */}
        <section className="card">
          <div className="card-title">
            <h2>分享</h2>
            <span className={`status status-${cardStatus['share'] ?? 'idle'}`}>
              {statusIcon('share')}
            </span>
          </div>
          <button onClick={shareContent}>分享内容</button>
          {errors['share'] && <p className="error">{errors['share']}</p>}
        </section>

        {/* Screen Orientation */}
        <section className="card">
          <div className="card-title">
            <h2>屏幕方向</h2>
            <span className={`status status-${cardStatus['orientation'] ?? 'idle'}`}>
              {statusIcon('orientation')}
            </span>
          </div>
          <button onClick={getOrientation}>获取屏幕方向</button>
          {errors['orientation'] && <p className="error">{errors['orientation']}</p>}
          {orientation && (
            <div className="result">
              <p><strong>方向:</strong> {orientation}</p>
            </div>
          )}
        </section>

        {/* Motion / Accelerometer */}
        <section className="card">
          <div className="card-title">
            <h2>加速度传感器</h2>
            <span className={`status status-${cardStatus['motion'] ?? 'idle'}`}>
              {statusIcon('motion')}
            </span>
          </div>
          <button onClick={toggleMotion}>
            {motionListening ? '停止监听' : '开始监听'}
          </button>
          {errors['motion'] && <p className="error">{errors['motion']}</p>}
          {motionData && (
            <div className="result motion-data">
              <p><strong>X:</strong> {motionData.x}</p>
              <p><strong>Y:</strong> {motionData.y}</p>
              <p><strong>Z:</strong> {motionData.z}</p>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>Powered by Capacitor + React + TypeScript</p>
      </footer>
    </div>
  );
}

export default App;
