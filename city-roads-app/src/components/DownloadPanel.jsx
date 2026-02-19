import './DownloadPanel.css';

function DownloadPanel({ svgRef, cityName }) {
  const sanitized = cityName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const downloadSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitized}_roads.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 2x resolution for print quality
      canvas.width = svg.viewBox.baseVal.width * 2;
      canvas.height = svg.viewBox.baseVal.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${sanitized}_roads.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = url;
  };

  return (
    <div className="download-panel">
      <h3 className="download-title">Download your map</h3>
      <p className="download-note">
        High-resolution files ready for printing or uploading to print-on-demand services.
      </p>
      <div className="download-buttons">
        <button className="dl-btn dl-btn--svg" onClick={downloadSVG}>
          <span className="dl-icon">&#8659;</span> Download SVG
          <span className="dl-sub">Scalable · Best for printing</span>
        </button>
        <button className="dl-btn dl-btn--png" onClick={downloadPNG}>
          <span className="dl-icon">&#8659;</span> Download PNG
          <span className="dl-sub">2× resolution · Ready to upload</span>
        </button>
      </div>
      <p className="zazzle-tip">
        To put your map on a product, download the PNG above, then visit{' '}
        <a href="https://www.zazzle.com" target="_blank" rel="noreferrer">Zazzle.com</a>,
        create an account, click <strong>Sell &rarr; Create products</strong>, and upload your image.
      </p>
    </div>
  );
}

export default DownloadPanel;
