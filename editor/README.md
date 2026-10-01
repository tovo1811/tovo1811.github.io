# Grafik-Editor

Ein Canva-ähnlicher Design-Editor, der komplett im Browser läuft (Fabric.js, kein Backend).
Läuft unter `https://tovo1811.github.io/editor/`.

## Funktionen

- **Formate:** Instagram (Beitrag, Hochformat, Story), Facebook, YouTube-Thumbnail, Präsentation, Pinterest, Flyer A4, Visitenkarte, Logo, eigene Größe; nachträglich „Größe ändern“ (Inhalte werden mitskaliert)
- **Vorlagen**, die sich jedem Format anpassen (Sale, Zitat, Event, Minimal, Neon, Ankündigung, Geburtstag, Business)
- **Text:** 26 Google Fonts, Größe, Farbe/Verlauf, fett/kursiv/unterstrichen, Ausrichtung, Zeichen- und Zeilenabstand, Effekte (Schatten, Leuchten, Kontur, Hohl), Schriftkombinationen
- **Elemente:** 18 Formen, Linien und Pfeile, Emojis; Füllfarbe, Verläufe, Rahmen, Eckenradius
- **Bilder:** Upload (Button, Drag & Drop, Einfügen aus der Zwischenablage), Filter, Helligkeit/Kontrast/Sättigung/Unschärfe, runde Ecken/Kreis, als Hintergrund setzen
- **Hintergrund:** Farben, Verläufe, Bilder
- **Ebenen:** Reihenfolge, Ein-/Ausblenden, Sperren, Gruppieren, An der Seite ausrichten, Spiegeln, Hilfslinien beim Verschieben
- Rückgängig/Wiederholen, Duplizieren, Kopieren/Einfügen, Tastenkürzel, Zoom (auch per Zwei-Finger-Geste)
- **Automatisches Speichern** im Gerät (IndexedDB), Übersicht „Deine Designs“
- **Export:** PNG (auch transparent), JPG, PDF, in 1×/2×/3×; Teilen über das Teilen-Menü des Systems
- Für Handys optimiert: Bottom-Navigation, Panels als Bottom-Sheet

## In die App einbinden

Den Editor in einer WebView öffnen, z. B.:

```
https://tovo1811.github.io/editor/?embed=1&format=instagram-post
https://tovo1811.github.io/editor/?embed=1&w=1080&h=1920&template=sale
```

| Parameter | Bedeutung |
|---|---|
| `embed=1` | Zeigt den Button „Fertig“, der das Design an die App übergibt |
| `format` | `instagram-post`, `instagram-portrait`, `story`, `facebook-post`, `youtube-thumbnail`, `presentation`, `pinterest`, `flyer-a4`, `business-card`, `logo` |
| `w`, `h` | Eigene Größe in Pixeln (statt `format`) |
| `template` | `sale`, `quote`, `event`, `minimal`, `neon`, `announcement`, `birthday`, `business` |
| `name` | Name des neuen Designs |
| `exportFormat` | `png` (Standard) oder `jpg` für „Fertig“ |
| `exportScale` | Skalierung für „Fertig“, z. B. `2` |

Ohne `format`/`w`/`h` erscheint die Startseite mit allen Formaten und gespeicherten Designs.

### Ergebnis empfangen

Bei „Fertig“ (und bei „Herunterladen“ innerhalb einer App) schickt der Editor ein JSON-Objekt:

```json
{
  "type": "design-editor:export",
  "designId": "…",
  "name": "Mein Design",
  "width": 1080,
  "height": 1080,
  "mimeType": "image/png",
  "dataUrl": "data:image/png;base64,…",
  "json": { "…": "Design-Daten zum späteren erneuten Laden" }
}
```

Beim Herunterladen ist `type` = `design-editor:download` und zusätzlich `filename` gesetzt.

Es wird jeder vorhandene Kanal genutzt:

- **Android WebView:** `webView.addJavascriptInterface(obj, "Android")` mit
  `@JavascriptInterface fun onDesignExported(json: String)`
- **React Native WebView:** `onMessage={e => JSON.parse(e.nativeEvent.data)}`
- **Flutter:** `flutter_inappwebview` Handler `onDesignExported` oder `webview_flutter` JavaScriptChannel `DesignEditorChannel`
- **iOS WKWebView:** Message-Handler `designEditor`
- **iframe:** `window.parent.postMessage(payload, '*')`

Kotlin-Beispiel:

```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true
webView.addJavascriptInterface(object {
    @JavascriptInterface
    fun onDesignExported(json: String) {
        val data = JSONObject(json)
        val base64 = data.getString("dataUrl").substringAfter(",")
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        // Bild speichern, hochladen, teilen …
    }
}, "Android")
webView.loadUrl("https://tovo1811.github.io/editor/?embed=1&format=story")
```

Für den Bild-Upload in der Android-WebView muss `WebChromeClient.onShowFileChooser` implementiert sein.

### Von der App aus steuern

Über `evaluateJavascript` steht `window.DesignEditor` zur Verfügung:

```js
DesignEditor.newDesign(1080, 1080, 'sale')   // neues Design (optional mit Vorlage)
DesignEditor.addImage('data:image/png;base64,…')
DesignEditor.setBackgroundImage(url)
DesignEditor.addText('Hallo')
DesignEditor.loadJSON(json)                  // zuvor exportiertes "json" wieder laden
DesignEditor.getJSON()
DesignEditor.exportImage('png', 2)           // liefert eine Data-URL
DesignEditor.finish()                        // wie der Button „Fertig“
```

Dasselbe geht per `postMessage` mit `type`: `design-editor:add-image` (`src`), `design-editor:set-background` (`src`),
`design-editor:add-text` (`text`), `design-editor:load` (`json`), `design-editor:new` (`width`, `height`, `template`), `design-editor:finish`.

Bilder von fremden Domains brauchen CORS-Header, sonst kann das Design nicht exportiert werden. Data-URLs funktionieren immer.

## Dateien

- `index.html`, `editor.css` – Oberfläche
- `js/app.js` – Editor-Logik
- `js/data.js` – Formate, Schriften, Farben, Formen, Vorlagen (hier lassen sich neue Vorlagen ergänzen)
- `js/vendor/` – Fabric.js 5.5.2 und jsPDF 2.5.2 (MIT-Lizenz)
