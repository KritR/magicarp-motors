# Google Cloud OpenTofu Configuration

This is the base OpenTofu configuration for managing infrastructure in your Google Cloud project.

## Prerequisites

1. [OpenTofu](https://opentofu.org/docs/intro/install/) installed (>= 1.6)
2. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
3. Authenticated with GCP: `gcloud auth application-default login`
4. Appropriate permissions to manage resources in your GCP project

## Setup

1. Initialize OpenTofu:
   ```bash
   tofu init
   ```

2. Review the planned changes:
   ```bash
   tofu plan
   ```

3. Apply the configuration:
   ```bash
   tofu apply
   ```

## Project Structure

- `provider.tf` - OpenTofu and Google Cloud provider configuration
- `variables.tf` - Input variable definitions
- `main.tf` - Main infrastructure resources
- `terraform.tfvars` - Variable values (gitignored)

## Adding Resources

Add your GCP resources to `main.tf`. For examples, see the [Google Cloud Provider documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs).

## Streaming Server

This configuration deploys a MediaMTX Media Server that supports multiple streaming protocols:
- **RTMP** (port 1935) - Traditional streaming protocol
- **SRT** (port 9998) - Low-latency streaming protocol with HEVC support
- **HLS** (port 80) - HTTP-based adaptive streaming with low-latency variant
- **RTSP** (port 8554) - Real-time streaming protocol
- **WebRTC** (port 8889) - Real-time communication protocol
- **API** (port 9997) - Management API

### Prerequisites

- ffmpeg installed: `brew install ffmpeg`
- Streaming server running (deployed via this OpenTofu configuration)

## Testing Camera Streams

### Option 1: RTMP Streaming (Traditional)

Stream using the RTMP protocol:

```bash
./test_stream_camera [stream_key]
```

**Viewing RTMP streams:**
```
http://magicarp.krithikrao.com/live/[stream_key].m3u8
```

### Option 2: SRT Streaming (Low Latency)

Stream using the SRT protocol for lower latency:

```bash
./test_stream_camera_srt [stream_key]
```

**Viewing SRT streams:**

In OBS Studio:
1. Add Media Source
2. Use URL: `srt://magicarp.krithikrao.com:9998?streamid=#!::r=live/[stream_key],m=request`

Or watch the HLS output:
```
http://magicarp.krithikrao.com/live/[stream_key].m3u8
```

### Arguments

- `stream_key` (optional): A unique identifier for your stream. Defaults to "test" (RTMP) or "livestream" (SRT).

### Examples

```bash
# RTMP: Stream with default key "test"
./test_stream_camera

# RTMP: Stream with custom key "camera1"
./test_stream_camera camera1

# SRT: Stream with default key "livestream"
./test_stream_camera_srt

# SRT: Stream with custom key "camera1"
./test_stream_camera_srt camera1
```

### Viewing Streams

**HLS (recommended for playback):**
```
http://magicarp.krithikrao.com/[stream_key]/index.m3u8
```

**RTMP:**
```
rtmp://magicarp.krithikrao.com/[stream_key]
```

**SRT:**
```
srt://magicarp.krithikrao.com:9998?streamid=read:[stream_key]
```

Compatible players:
- VLC Media Player
- OBS Studio (Media Source)
- FFplay
- Any HLS-compatible video player

Press `Ctrl+C` to stop streaming.

