from google.genai import types
print("LiveConnectConfig in types:", hasattr(types, 'LiveConnectConfig'))
print("SessionResumptionConfig in types:", hasattr(types, 'SessionResumptionConfig'))
print("PrebuiltVoiceConfig in types:", hasattr(types, 'PrebuiltVoiceConfig'))

import inspect
if hasattr(types, 'LiveConnectConfig'):
    print("LiveConnectConfig fields:", list(types.LiveConnectConfig.model_fields.keys()) if hasattr(types.LiveConnectConfig, 'model_fields') else dir(types.LiveConnectConfig))
